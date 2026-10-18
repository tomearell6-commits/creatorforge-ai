/**
 * SEO Auto-Poster — run ONE post for ONE site (server-only, service-role client).
 *
 * Order matters and is deliberate:
 *   1. connection  — is the WordPress login still valid?        (hard fail → pause site)
 *   2. credits     — can the user afford a full post?           (soft: wait + alert)
 *   3. topic       — next planned topic, replenishing the queue
 *   4. image       — render the realistic image FIRST          (soft: wait, costs us ~nothing if it fails)
 *   5. article     — write ≥ min words, strict (never placeholder text)
 *   6. publish     — post to WordPress with the featured image
 * Credits are charged only after a post is really live. Soft failures (credits,
 * image) never deactivate a site — it just waits and retries next hour; hard or
 * repeated failures pause the site and tell the user why.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/security/secrets";
import { normalizeSite, checkWordPressAuth } from "@/lib/publishing/providers/wordpress";
import { fetchWithTimeout } from "@/lib/http";
import { generateSeoPackage, countWords, type SeoPackage } from "@/lib/seo/generate";
import { generateArticleImage } from "@/lib/seo/images";
import { publishArticleToWordPress } from "@/lib/seo/publish";
import { composeArticleHtml } from "@/lib/seo/compose";
import { notify } from "@/lib/notifications/service";
import { notifyIndexNow, blogPostUrl } from "@/lib/seo/indexnow";
import { slugifyBlog, estimateReadingMinutes, sanitizeBlogHtml } from "@/lib/blog/blog";
import { captureError } from "@/lib/logger";
import { planTopics, type Topic } from "./topics";
import { isSiteDue, startOfUtcDay } from "./schedule";
import { CREDITS_PER_POST, ARTICLE_IMAGE_CREDITS, MAX_PENDING_REVIEW, needsReview } from "./limits";
import { chooseCategory } from "./category";
import { ensureInternalLinks } from "./links";
import { screenSite } from "@/lib/seo/policy-server";
import { POLICY_MESSAGE } from "@/lib/seo/policy";
import { uploadMedia } from "@/lib/media/storage";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.creatorsforge.io";
const MAX_FAILURES = 3;

type Stage = "connection" | "policy" | "credits" | "review" | "topic" | "image" | "article" | "publish";

class StageError extends Error {
  constructor(
    public stage: Stage,
    message: string,
    public opts: { soft?: boolean; hard?: boolean } = {}
  ) {
    super(message);
  }
}

export type RunOutcome = {
  status: "published" | "drafted" | "failed" | "skipped";
  stage?: Stage;
  message: string;
  title?: string;
  postUrl?: string;
  words?: number;
  articleId?: string;
};

type SiteRow = {
  id: string; user_id: string; wordpress_site_id: string | null; destination?: string; active: boolean; niche: string;
  posts_per_day: number; audience: string; language: string; min_words: number;
  mode?: string; publish_hours: number[]; topic_queue: Topic[] | null; research: unknown;
  consecutive_failures: number; posts_published: number;
};

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Unknown error";
}

/** Titles to avoid repeating: our own previous articles plus the site's recent posts. */
async function existingTitles(admin: SupabaseClient, siteId: string, wpBase: string): Promise<string[]> {
  const out: string[] = [];
  const { data } = await admin.from("seo_articles").select("seo_title, main_keyword").eq("autopost_site_id", siteId).order("created_at", { ascending: false }).limit(150);
  for (const r of data ?? []) {
    if (r.seo_title) out.push(r.seo_title as string);
    if (r.main_keyword) out.push(r.main_keyword as string);
  }
  try {
    const res = await fetchWithTimeout(`${wpBase}/wp-json/wp/v2/posts?per_page=50&_fields=title`, { headers: { "User-Agent": UA } }, 15_000);
    if (res.ok) {
      const posts = (await res.json()) as { title?: { rendered?: string } }[];
      for (const p of posts) if (p.title?.rendered) out.push(p.title.rendered.replace(/<[^>]+>/g, ""));
    }
  } catch { /* best-effort */ }
  return out;
}

/** The site's own published posts and pages (public REST), used for internal linking. */
async function internalLinkCandidates(wpBase: string): Promise<{ url: string; title: string }[]> {
  const out: { url: string; title: string }[] = [];
  for (const kind of ["posts?per_page=40", "pages?per_page=20"]) {
    try {
      const res = await fetchWithTimeout(`${wpBase}/wp-json/wp/v2/${kind}&_fields=title,link`, { headers: { "User-Agent": UA } }, 15_000);
      if (!res.ok) continue;
      const rows = (await res.json()) as { title?: { rendered?: string }; link?: string }[];
      for (const r of rows) {
        const title = (r.title?.rendered ?? "").replace(/<[^>]+>/g, "").replace(/&#8217;|&#8216;/g, "'").replace(/&amp;/g, "&").trim();
        if (r.link && title) out.push({ url: r.link, title });
      }
    } catch { /* best-effort */ }
  }
  return out.slice(0, 40);
}

async function writeLog(admin: SupabaseClient, row: Record<string, unknown>) {
  await admin.from("seo_autopost_log").insert(row).then(() => {}, () => {});
}

/** The CreatorsForge blog's own base URL (used for internal links and IndexNow). */
const BLOG_SITE = "https://www.creatorsforge.io";

async function uniqueBlogSlug(admin: SupabaseClient, base: string): Promise<string> {
  const root = base || "post";
  let slug = root;
  for (let n = 2; n < 50; n++) {
    const { data } = await admin.from("blog_posts").select("id").eq("slug", slug).limit(1);
    if (!(data ?? []).length) return slug;
    slug = `${root}-${n}`.slice(0, 70);
  }
  return `${root}-${Date.now()}`.slice(0, 70);
}

/**
 * Destination = the CreatorsForge blog (platform owner only). Same pipeline as WordPress, but the post is
 * written straight into blog_posts. First-party content: no customer credits are charged.
 * "review" mode saves a draft (publish it from Admin → Blog); every other mode publishes immediately.
 */
async function runBlogDestination(admin: SupabaseClient, s: SiteRow, started: number): Promise<RunOutcome> {
  let title: string | undefined;
  try {
    const draft = s.mode === "review";

    if (draft) {
      const { count: pending } = await admin.from("blog_posts").select("id", { count: "exact", head: true }).eq("created_by", s.user_id).eq("source", "autopilot").eq("status", "draft");
      if ((pending ?? 0) >= MAX_PENDING_REVIEW) {
        throw new StageError("review", `You have ${pending} drafts waiting in Admin → Blog. Publish or delete some and writing will continue.`, { soft: true });
      }
    }

    // Topic (avoid repeating what the blog already covers).
    const { data: existing } = await admin.from("blog_posts").select("title, focus_keyword, slug, status").order("created_at", { ascending: false }).limit(200);
    let queue: Topic[] = Array.isArray(s.topic_queue) ? s.topic_queue : [];
    if (queue.length === 0) {
      const have = (existing ?? []).flatMap((r) => [r.title as string, r.focus_keyword as string]).filter(Boolean);
      try {
        queue = await planTopics({ niche: s.niche, existingTitles: have, research: s.research });
      } catch (e) {
        throw new StageError("topic", `Could not plan new topics: ${errMsg(e)}`);
      }
      if (queue.length === 0) throw new StageError("topic", "The topic planner found no new topics to write.");
    }
    const topic = queue[0];
    const rest = queue.slice(1);
    title = topic.title || topic.keyword;

    // Image first, so an image-service problem stops us before paying for the article.
    let img;
    try {
      img = await generateArticleImage({ title, keyword: topic.keyword });
    } catch (e) {
      throw new StageError("image", `Image generation is unavailable right now: ${errMsg(e).slice(0, 200)}`, { soft: true });
    }

    // Article.
    const links = (existing ?? []).filter((r) => r.status === "published" && r.slug && r.title).slice(0, 40).map((r) => ({ url: blogPostUrl(r.slug as string), title: r.title as string }));
    let pkg;
    try {
      const research = (s.research ?? {}) as { brand?: { name?: string; summary?: string; offerings?: string[]; audience?: string; tone?: string } };
      ({ pkg } = await generateSeoPackage(
        {
          mainKeyword: topic.keyword,
          secondaryKeywords: topic.secondaryKeywords,
          brandContext: research.brand,
          angle: (topic as Topic & { angle?: string }).angle,
          internalLinks: links.length ? links : undefined,
          niche: s.niche,
          targetAudience: "creators, marketers and small businesses",
          searchIntent: topic.intent,
          minWords: s.min_words,
          language: s.language,
          brandName: "CreatorsForge",
          productName: "CreatorsForge",
          cta: "Start free at CreatorsForge.io",
          model: process.env.SEO_AUTOPOST_MODEL || "claude-sonnet-5-5",
        },
        { strict: true }
      ));
    } catch (e) {
      throw new StageError("article", errMsg(e));
    }
    const words = countWords(pkg.articleContent);
    // The blog page renders the FAQ from faq_json, so it is NOT composed into the body here.
    const html = sanitizeBlogHtml(ensureInternalLinks(pkg.articleContent, links, { siteUrl: BLOG_SITE, keyword: topic.keyword, title: pkg.seoTitle || title || topic.keyword }).html);

    let coverUrl: string;
    try {
      coverUrl = (await uploadMedia(admin, { userId: s.user_id, type: "image", bytes: img.data, contentType: img.contentType, ext: "jpg" })).url;
    } catch (e) {
      throw new StageError("publish", `Could not save the cover image: ${errMsg(e)}`);
    }

    const slug = await uniqueBlogSlug(admin, slugifyBlog(pkg.slug || topic.keyword));
    const nowIso = new Date().toISOString();
    const postTitle = pkg.seoTitle || pkg.h1 || topic.keyword;
    const { data: post, error: insErr } = await admin.from("blog_posts").insert({
      slug, title: postTitle, meta_title: pkg.metaTitle || null, meta_description: pkg.metaDescription || null, excerpt: pkg.excerpt || null,
      content_html: html, cover_image_url: coverUrl, cover_image_alt: postTitle, tags: (pkg.tags ?? []).slice(0, 12),
      category: chooseCategory({ fromWriter: pkg.category, intent: topic.intent }), focus_keyword: pkg.focusKeyword || topic.keyword, faq_json: pkg.faq ?? [],
      status: draft ? "draft" : "published", published_at: draft ? null : nowIso, source: "autopilot",
      reading_minutes: estimateReadingMinutes(html), seo_score: typeof pkg.seoScore === "number" ? pkg.seoScore : null, created_by: s.user_id,
    }).select("id, slug").single();
    if (insErr || !post) throw new StageError("publish", `Could not save the post: ${insErr?.message ?? "unknown error"}`);

    const url = blogPostUrl(post.slug as string);
    const indexNow = draft ? null : await notifyIndexNow(admin, url);
    await admin.from("seo_autopost_sites").update({
      topic_queue: rest, last_run_at: nowIso, consecutive_failures: 0, paused_reason: null, updated_at: nowIso,
      ...(draft ? {} : { last_success_at: nowIso, posts_published: (s.posts_published ?? 0) + 1 }),
    }).eq("id", s.id);
    const message = draft ? "Draft saved. Publish it from Admin → Blog." : indexNow?.message ?? "Published.";
    await writeLog(admin, { user_id: s.user_id, site_id: s.id, status: draft ? "drafted" : "published", message, title: postTitle, post_url: draft ? null : url, words, credits_charged: 0, duration_ms: Date.now() - started });

    return { status: draft ? "drafted" : "published", message: draft ? message : `Published. ${message}`, title: postTitle, postUrl: draft ? undefined : url, words };
  } catch (e) {
    const err = e instanceof StageError ? e : new StageError("article", errMsg(e));
    if (!(e instanceof StageError)) captureError(e, { category: "jobs", feature: "seo-autopost-blog", siteId: s.id });
    return handleFailure(admin, s, err, title, started);
  } finally {
    await admin.from("seo_autopost_sites").update({ claimed_at: null }).eq("id", s.id);
  }
}

export async function runAutopostForSite(admin: SupabaseClient, siteId: string, opts: { force?: boolean } = {}): Promise<RunOutcome> {
  const started = Date.now();
  const { data: s } = (await admin.from("seo_autopost_sites").select("*").eq("id", siteId).maybeSingle()) as { data: SiteRow | null };
  if (!s) return { status: "skipped", message: "Auto-poster not found." };
  if (!s.active && !opts.force) return { status: "skipped", message: "Auto-poster is paused." };

  // Due check (a manual "run now" is allowed only while today's quota is not used up).
  const since = startOfUtcDay(new Date()).toISOString();
  const { count } = await admin.from("seo_autopost_log").select("id", { count: "exact", head: true }).eq("site_id", siteId).in("status", ["published", "drafted"]).gte("created_at", since);
  const publishedToday = count ?? 0;
  if (opts.force ? publishedToday >= s.posts_per_day : !isSiteDue({ hours: s.publish_hours, publishedToday, now: new Date() })) {
    await admin.from("seo_autopost_sites").update({ claimed_at: null }).eq("id", siteId);
    return { status: "skipped", message: opts.force ? `You have already used today's ${s.posts_per_day === 1 ? "article" : s.posts_per_day + " articles"} (your site is set to ${s.posts_per_day} a day). The next one goes out tomorrow at the usual time.${s.posts_per_day === 1 ? ' To write another one now, change "Articles per day" to 2.' : ""}` : "Not due yet." };
  }

  // The CreatorsForge blog is its own destination (no WordPress, no customer credits).
  if (s.destination === "creatorforge_blog") return runBlogDestination(admin, s, started);

  let title: string | undefined;
  try {
    // 1) Connection
    const { data: wp } = await admin.from("wordpress_sites").select("*").eq("id", s.wordpress_site_id ?? "").maybeSingle();
    if (!wp) throw new StageError("connection", "The WordPress site was disconnected.", { hard: true });
    const appPassword = decryptSecret(wp.encrypted_application_password as string);
    if (!appPassword) throw new StageError("connection", "Could not read the saved WordPress login — please reconnect the site.", { hard: true });
    const base = normalizeSite(wp.site_url as string);
    const auth = `Basic ${Buffer.from(`${wp.username}:${appPassword.replace(/\s+/g, "")}`).toString("base64")}`;
    const check = await checkWordPressAuth(base, auth);
    if (!check.ok) {
      // A wrong login or a firewall block needs the owner's attention (pause); a down site just retries.
      throw new StageError("connection", check.message, { hard: check.kind === "bad_login" || check.kind === "blocked" });
    }

    // 1b) Category check on every run: pause (and tell the owner) if the site sells products we cannot promote.
    const policy = await screenSite(base);
    if (policy.blocked) throw new StageError("policy", POLICY_MESSAGE, { hard: true });

    // 2) Credits
    const { data: prof } = await admin.from("profiles").select("credits").eq("user_id", s.user_id).maybeSingle();
    if ((prof?.credits ?? 0) < CREDITS_PER_POST) {
      throw new StageError("credits", `Not enough credits — each post needs ${CREDITS_PER_POST}. Top up to continue.`, { soft: true });
    }

    // 2b) Review mode: don't pile up drafts nobody has read (each one costs credits).
    const reviewMode = needsReview(s.mode, s.posts_published ?? 0);
    if (reviewMode) {
      const { count: pending } = await admin.from("seo_articles").select("id", { count: "exact", head: true }).eq("autopost_site_id", s.id).eq("status", "pending_review");
      if ((pending ?? 0) >= MAX_PENDING_REVIEW) {
        throw new StageError("review", `You have ${pending} articles waiting for your review. Approve or reject some and writing will continue.`, { soft: true });
      }
    }

    // 3) Topic
    let queue: Topic[] = Array.isArray(s.topic_queue) ? s.topic_queue : [];
    if (queue.length === 0) {
      try {
        queue = await planTopics({ niche: s.niche, existingTitles: await existingTitles(admin, s.id, base), research: s.research });
      } catch (e) {
        throw new StageError("topic", `Could not plan new topics: ${errMsg(e)}`);
      }
      if (queue.length === 0) throw new StageError("topic", "The topic planner found no new topics to write.");
    }
    const topic = queue[0];
    const rest = queue.slice(1);
    title = topic.title || topic.keyword;

    // 4) Image first — if the image service is unavailable we stop before paying for the article.
    let img;
    try {
      img = await generateArticleImage({ title, keyword: topic.keyword });
    } catch (e) {
      throw new StageError("image", `Image generation is unavailable right now: ${errMsg(e).slice(0, 200)}`, { soft: true });
    }

    // 5) Article (strict: never placeholder text)
    let pkg;
    let links: { url: string; title: string }[] = [];
    try {
      // What the SEO analysis learned about this brand, and the real pages we can link to.
      const research = (s.research ?? {}) as { brand?: { name?: string; summary?: string; offerings?: string[]; audience?: string; tone?: string } };
      links = await internalLinkCandidates(base);
      ({ pkg } = await generateSeoPackage(
        {
          mainKeyword: topic.keyword,
          secondaryKeywords: topic.secondaryKeywords,
          brandContext: research.brand,
          angle: (topic as Topic & { angle?: string }).angle,
          internalLinks: links.length ? links : undefined,
          niche: s.niche,
          targetAudience: s.audience === "worldwide" ? "readers worldwide" : s.audience,
          searchIntent: topic.intent,
          minWords: s.min_words,
          language: s.language,
          brandName: (wp.site_name as string) || undefined,
          model: process.env.SEO_AUTOPOST_MODEL || "claude-sonnet-5-5",
        },
        { strict: true }
      ));
    } catch (e) {
      throw new StageError("article", errMsg(e));
    }
    const words = countWords(pkg.articleContent);
    // The writer sometimes skips internal links; guarantee at least a few real ones.
    const content = ensureInternalLinks(composeArticleHtml(pkg.articleContent, pkg.faq), links, { siteUrl: base, keyword: topic.keyword, title: pkg.seoTitle || title || topic.keyword }).html;
    const category = chooseCategory({ siteDefault: wp.default_category as string | null, fromWriter: pkg.category, intent: topic.intent });

    // 5b) Review mode: save the finished article + image for the owner and stop here.
    if (reviewMode) {
      return await saveDraftForReview({ admin, s, topic, pkg, content, words, category, img, rest, started });
    }

    // 6) Save + publish
    const { data: art, error: insErr } = await admin.from("seo_articles").insert({
      user_id: s.user_id, wordpress_site_id: s.wordpress_site_id, main_keyword: topic.keyword,
      secondary_keywords: pkg.secondaryKeywords, target_audience: s.audience, search_intent: pkg.searchIntent,
      language: s.language, seo_title: pkg.seoTitle, meta_title: pkg.metaTitle, meta_description: pkg.metaDescription,
      slug: pkg.slug, h1: pkg.h1, outline_json: pkg.outline, article_content: content, faq_json: pkg.faq,
      featured_image_prompt: pkg.featuredImagePrompt, alt_text_json: pkg.altText, excerpt: pkg.excerpt,
      tags: pkg.tags, category, internal_links: pkg.internalLinks, external_links: pkg.externalLinks,
      seo_score: pkg.seoScore, readability_score: pkg.readabilityScore, word_count: words,
      status: "publishing", source: "autopost", autopost_site_id: s.id,
    }).select("id").single();
    if (insErr || !art) throw new StageError("publish", `Could not save the article: ${insErr?.message ?? "unknown error"}`);

    const res = await publishArticleToWordPress({
      siteUrl: wp.site_url as string, username: wp.username as string, appPassword,
      title: pkg.seoTitle || pkg.h1 || topic.keyword, contentHtml: content, excerpt: pkg.excerpt, slug: pkg.slug,
      category, tags: pkg.tags, metaTitle: pkg.metaTitle, metaDescription: pkg.metaDescription, focusKeyword: pkg.focusKeyword,
      status: "publish", featuredImage: { data: img.data, contentType: img.contentType },
    });
    if (!res.ok) {
      await admin.from("seo_articles").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", art.id);
      await admin.from("wordpress_publish_history").insert({ user_id: s.user_id, article_id: art.id, wordpress_site_id: s.wordpress_site_id, status: "failed", error: res.error });
      throw new StageError("publish", res.error);
    }

    // Live. Record it, then charge (only now).
    const nowIso = new Date().toISOString();
    await admin.from("seo_articles").update({ status: "published", wordpress_post_id: res.postId, published_at: nowIso, updated_at: nowIso }).eq("id", art.id);
    await admin.from("wordpress_publish_history").insert({ user_id: s.user_id, article_id: art.id, wordpress_site_id: s.wordpress_site_id, status: "published", wordpress_post_id: res.postId, post_url: res.url, published_at: nowIso });
    await admin.rpc("wallet_adjust", { p_user: s.user_id, p_amount: -CREDITS_PER_POST, p_type: "publishing", p_reason: "seo_autopost" });
    // Tell Bing, Yandex, Naver, Seznam and Yep immediately (free; skipped honestly if not connected).
    const indexNow = await notifyIndexNow(admin, res.url);
    await admin.from("seo_autopost_sites").update({
      topic_queue: rest, last_run_at: nowIso, last_success_at: nowIso, posts_published: (s.posts_published ?? 0) + 1,
      consecutive_failures: 0, paused_reason: null, updated_at: nowIso,
    }).eq("id", s.id);
    await writeLog(admin, { user_id: s.user_id, site_id: s.id, article_id: art.id, status: "published", message: indexNow.message, title: pkg.seoTitle, post_url: res.url, words, credits_charged: CREDITS_PER_POST, duration_ms: Date.now() - started });

    // Automatic mode: tell the owner what just went live (they can undo it from the dashboard).
    try {
      const { data: u } = await admin.auth.admin.getUserById(s.user_id);
      const safeTitle = (pkg.seoTitle || "").replace(/</g, "&lt;");
      await notify(admin, {
        userId: s.user_id, email: u.user?.email ?? null, type: "seo_article_published", category: "subscription",
        title: "A new article was published", message: pkg.seoTitle,
        ctaLabel: "View the article", ctaUrl: res.url,
        mail: { subject: "New article published on your website", html: `<p>${safeTitle}</p><p><a href="${res.url}">View it live</a></p><p>Not happy with it? Open <a href="${APP_URL}/dashboard/seo/autopilot">SEO Autopilot</a> and click Unpublish.</p>` },
        dedup: { threshold: art.id as string, billingPeriod: "" },
      });
    } catch { /* notification is best-effort */ }

    return { status: "published", message: `Published. ${indexNow.message}`, title: pkg.seoTitle, postUrl: res.url, words, articleId: art.id };
  } catch (e) {
    const err = e instanceof StageError ? e : new StageError("article", errMsg(e));
    if (!(e instanceof StageError)) captureError(e, { category: "jobs", feature: "seo-autopost", siteId });
    return handleFailure(admin, s, err, title, started);
  } finally {
    await admin.from("seo_autopost_sites").update({ claimed_at: null }).eq("id", siteId);
  }
}

/**
 * Review mode: keep the finished article and its image, and wait for the owner to approve.
 * The writing cost (article + image) is charged now because it has been spent; the small
 * publishing fee is charged when the owner approves.
 */
async function saveDraftForReview(a: {
  admin: SupabaseClient; s: SiteRow; topic: Topic; pkg: SeoPackage; content: string; words: number;
  category: string | null; img: { data: Uint8Array; contentType: string }; rest: Topic[]; started: number;
}): Promise<RunOutcome> {
  const { admin, s, topic, pkg, content, words, category, img, rest, started } = a;

  let imageUrl: string;
  try {
    imageUrl = (await uploadMedia(admin, { userId: s.user_id, type: "image", bytes: img.data, contentType: img.contentType, ext: "jpg" })).url;
  } catch (e) {
    throw new StageError("publish", `Could not save the article image for review: ${errMsg(e)}`);
  }

  const { data: art, error: insErr } = await admin.from("seo_articles").insert({
    user_id: s.user_id, wordpress_site_id: s.wordpress_site_id, main_keyword: topic.keyword,
    secondary_keywords: pkg.secondaryKeywords, target_audience: s.audience, search_intent: pkg.searchIntent,
    language: s.language, seo_title: pkg.seoTitle, meta_title: pkg.metaTitle, meta_description: pkg.metaDescription,
    slug: pkg.slug, h1: pkg.h1, outline_json: pkg.outline, article_content: content, faq_json: pkg.faq,
    featured_image_prompt: pkg.featuredImagePrompt, alt_text_json: pkg.altText, excerpt: pkg.excerpt,
    tags: pkg.tags, category, internal_links: pkg.internalLinks, external_links: pkg.externalLinks,
    seo_score: pkg.seoScore, readability_score: pkg.readabilityScore, word_count: words,
    status: "pending_review", source: "autopost", autopost_site_id: s.id,
    metadata: { featuredImageUrl: imageUrl, focusKeyword: pkg.focusKeyword },
  }).select("id").single();
  if (insErr || !art) throw new StageError("publish", `Could not save the draft: ${insErr?.message ?? "unknown error"}`);

  const nowIso = new Date().toISOString();
  const { data: logRow } = await admin.from("seo_autopost_log").insert({
    user_id: s.user_id, site_id: s.id, article_id: art.id, status: "drafted", message: "Ready for your review.",
    title: pkg.seoTitle, words, credits_charged: ARTICLE_IMAGE_CREDITS, duration_ms: Date.now() - started,
  }).select("id").single();
  if (logRow) {
    await admin.from("seo_articles").update({ metadata: { featuredImageUrl: imageUrl, focusKeyword: pkg.focusKeyword, logId: logRow.id } }).eq("id", art.id);
  }

  await admin.rpc("wallet_adjust", { p_user: s.user_id, p_amount: -ARTICLE_IMAGE_CREDITS, p_type: "publishing", p_reason: "seo_autopost_draft" });
  await admin.from("seo_autopost_sites").update({
    topic_queue: rest, last_run_at: nowIso, consecutive_failures: 0, paused_reason: null, updated_at: nowIso,
  }).eq("id", s.id);

  // Tell the owner there is something to read (best-effort).
  try {
    const { data: u } = await admin.auth.admin.getUserById(s.user_id);
    await notify(admin, {
      userId: s.user_id, email: u.user?.email ?? null, type: "seo_article_review", category: "subscription",
      title: "A new article is ready for your review", message: pkg.seoTitle,
      ctaLabel: "Review the article", ctaUrl: "/dashboard/seo/autopilot",
      mail: { subject: "A new article is ready for your review", html: `<p>${pkg.seoTitle.replace(/</g, "&lt;")}</p><p><a href="${APP_URL}/dashboard/seo/autopilot">Read it and approve or reject</a></p>` },
      dedup: { threshold: art.id as string, billingPeriod: "" },
    });
  } catch { /* notification is best-effort */ }

  return { status: "drafted", message: "Draft ready for your review.", title: pkg.seoTitle, words, articleId: art.id as string };
}

async function handleFailure(admin: SupabaseClient, s: SiteRow, err: StageError, title: string | undefined, started: number): Promise<RunOutcome> {
  const soft = !!err.opts.soft;
  const failures = soft ? s.consecutive_failures ?? 0 : (s.consecutive_failures ?? 0) + 1;
  const deactivate = !soft && (!!err.opts.hard || failures >= MAX_FAILURES);
  const nowIso = new Date().toISOString();

  await admin.from("seo_autopost_sites").update({
    last_run_at: nowIso,
    consecutive_failures: failures,
    active: deactivate ? false : s.active,
    paused_reason: deactivate ? `Paused: ${err.message}` : soft ? `Waiting: ${err.message}` : s.consecutive_failures ? `Retrying after: ${err.message}` : null,
    updated_at: nowIso,
  }).eq("id", s.id);

  // Don't spam the log with the same soft failure every hour.
  let skipLog = false;
  if (soft) {
    const { data: last } = await admin.from("seo_autopost_log").select("stage, message, created_at").eq("site_id", s.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (last && last.stage === err.stage && last.message === err.message && Date.now() - new Date(last.created_at as string).getTime() < 6 * 3600_000) skipLog = true;
  }
  if (!skipLog) {
    await writeLog(admin, { user_id: s.user_id, site_id: s.id, status: "failed", stage: err.stage, message: err.message, title, duration_ms: Date.now() - started });
  }

  // Tell the user once per day per reason when something needs their attention.
  if (deactivate || err.stage === "credits") {
    try {
      const { data: u } = await admin.auth.admin.getUserById(s.user_id);
      const day = nowIso.slice(0, 10);
      await notify(admin, {
        userId: s.user_id,
        email: u.user?.email ?? null,
        type: deactivate ? "seo_autopost_paused" : "seo_autopost_credits",
        category: err.stage === "credits" ? "credit" : "subscription",
        title: deactivate ? "SEO Auto-Poster paused" : "SEO Auto-Poster is waiting for credits",
        message: err.message,
        ctaLabel: "Open SEO Auto-Poster",
        ctaUrl: "/dashboard/seo/autopost",
        mail: {
          subject: deactivate ? "Your SEO Auto-Poster was paused" : "Your SEO Auto-Poster needs credits",
          html: `<p>${err.message}</p><p><a href="${APP_URL}/dashboard/seo/autopost">Open SEO Auto-Poster</a></p>`,
        },
        dedup: { threshold: `${err.stage}:${s.id}`, billingPeriod: day },
      });
    } catch { /* notification is best-effort */ }
  }

  return { status: "failed", stage: err.stage, message: err.message, title };
}
