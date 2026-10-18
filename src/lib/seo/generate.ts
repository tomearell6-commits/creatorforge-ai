/**
 * SEO Content Studio generator. Produces a full SEO blog package as structured
 * JSON. Uses Claude when ANTHROPIC_API_KEY is set; otherwise a deterministic
 * placeholder so the flow always works (no credits charged for placeholder).
 *
 * Publishing-grade rules (enforced in code, not just requested in the prompt):
 *  - minimum body length (default 1,500 words) with one automatic expansion retry;
 *  - worldwide audience by default (no country-specific assumptions);
 *  - health topics: reputable-source rules, no fabricated studies/URLs, a standard
 *    medical disclaimer appended in code, and risky claims rejected;
 *  - `strict` mode never falls back to placeholder text — it throws instead, so
 *    automation can never publish "(placeholder answer)" content.
 */
import Anthropic from "@anthropic-ai/sdk";
import { findRiskyHealthClaims, isHealthTopic, withMedicalDisclaimer } from "./health";
import { addHeadingAnchorsAndToc, analyzeStructure } from "./structure";

export type SeoArticleInput = {
  mainKeyword: string;
  secondaryKeywords?: string[];
  /** The site's subject area (e.g. "cardiology education"); helps health detection and topic fit. */
  niche?: string;
  targetCountry?: string;
  targetAudience?: string;
  searchIntent?: string;
  articleType?: string;
  tone?: string;
  /** Legacy: desired length. Treated as the minimum when minWords is not given. */
  wordCount?: number;
  /** Minimum article body words (default 1,500). */
  minWords?: number;
  language?: string;
  brandName?: string;
  productName?: string;
  cta?: string;
  /** Override the model (e.g. a faster/cheaper one for bulk automation). */
  model?: string;
  /** What the website's brand is, learned from the SEO analysis — makes every post sound like the brand. */
  brandContext?: { name?: string; summary?: string; offerings?: string[]; audience?: string; tone?: string };
  /** Hard facts about how the business really operates (minimums, payments, what it does NOT offer). The writer must never contradict them. */
  rules?: string;
  /** The planned angle for this article (how to cover the topic better than what already ranks). */
  angle?: string;
  /** Real pages of the site the article may link to (internal linking). Any other link is removed. */
  internalLinks?: { url: string; title: string }[];
};

export type SeoPackage = {
  seoTitle: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  searchIntent: string;
  h1: string;
  outline: { h2: string; h3: string[] }[];
  articleContent: string; // HTML
  faq: { q: string; a: string }[];
  schemaRecommendation: string;
  imagePrompts: string[];
  featuredImagePrompt: string;
  altText: string[];
  excerpt: string;
  tags: string[];
  category: string;
  socialCaptions: { platform: string; text: string }[];
  newsletterSummary: string;
  cta: string;
  internalLinks: string[];
  externalLinks: string[];
  seoScore: number;
  readabilityScore: number;
};

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";
export const DEFAULT_MIN_WORDS = 1500;
const MAX_MIN_WORDS = 4000;

export class SeoGenerationError extends Error {}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
}
function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Words of visible text in an HTML string. */
export function countWords(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function placeholder(input: SeoArticleInput): SeoPackage {
  const kw = input.mainKeyword.trim();
  const kwTitle = titleCase(kw);
  const secondary = input.secondaryKeywords?.filter(Boolean) ?? [`best ${kw}`, `${kw} guide`, `${kw} tips`];
  const outline = [
    { h2: `What Is ${kwTitle}?`, h3: ["Definition", "Why it matters"] },
    { h2: `Key Benefits of ${kwTitle}`, h3: ["Benefit 1", "Benefit 2", "Benefit 3"] },
    { h2: `How to Get Started with ${kwTitle}`, h3: ["Step 1", "Step 2", "Step 3"] },
    { h2: `Common Mistakes to Avoid`, h3: [] },
    { h2: `${kwTitle}: Final Thoughts`, h3: [] },
  ];
  const body =
    `<h1>${kwTitle}: The Complete Guide</h1>\n` +
    outline
      .map(
        (o) =>
          `<h2>${o.h2}</h2>\n<p>${kwTitle} is essential for ${input.targetAudience || "your audience"}. ` +
          `This section covers ${o.h2.toLowerCase()} in clear, actionable detail.</p>\n` +
          o.h3.map((h) => `<h3>${h}</h3>\n<p>Details about ${h.toLowerCase()}.</p>`).join("\n")
      )
      .join("\n") +
    `\n<p>${input.cta || `Ready to get started? Try ${input.productName || input.brandName || "CreatorsForge"} today.`}</p>`;

  return {
    seoTitle: `${kwTitle}: The Complete ${new Date().getFullYear()} Guide`,
    metaTitle: `${kwTitle} — Complete Guide`,
    metaDescription: `Everything you need to know about ${kw}: benefits, how to get started, and common mistakes to avoid. ${input.cta || ""}`.slice(0, 160),
    slug: slugify(kw),
    focusKeyword: kw,
    secondaryKeywords: secondary,
    searchIntent: input.searchIntent || "Informational",
    h1: `${kwTitle}: The Complete Guide`,
    outline,
    articleContent: body,
    faq: [
      { q: `What is ${kw}?`, a: `${kwTitle} refers to … (placeholder answer).` },
      { q: `Is ${kw} worth it?`, a: `Yes — here's why … (placeholder answer).` },
      { q: `How do I start with ${kw}?`, a: `Follow these steps … (placeholder answer).` },
    ],
    schemaRecommendation: "Article + FAQPage JSON-LD",
    imagePrompts: outline.slice(0, 3).map((o) => `Editorial image illustrating "${o.h2}", clean, modern, ${input.tone || "professional"}`),
    featuredImagePrompt: `Hero image for an article about ${kw}, ${input.tone || "professional"}, 16:9, high quality`,
    altText: outline.slice(0, 3).map((o) => `${kwTitle} — ${o.h2}`),
    excerpt: `A complete guide to ${kw} — benefits, steps, and mistakes to avoid.`,
    tags: [kw, ...secondary].slice(0, 8),
    category: input.articleType || "Blog",
    socialCaptions: [
      { platform: "x", text: `New post: ${kwTitle} — the complete guide. ${secondary.map((s) => "#" + s.replace(/\s+/g, "")).slice(0, 2).join(" ")}` },
      { platform: "linkedin", text: `Just published a deep dive on ${kw}. Here's what you need to know 👇` },
    ],
    newsletterSummary: `This week: our complete guide to ${kw} — what it is, why it matters, and how to start.`,
    cta: input.cta || `Try ${input.productName || input.brandName || "CreatorsForge"} today.`,
    internalLinks: [`/blog/${slugify(secondary[0] || kw)}`],
    externalLinks: ["https://example.com/authoritative-source"],
    seoScore: 78,
    readabilityScore: 72,
  };
}

export function willUseRealSeoAI(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const JSON_SHAPE =
  "{seoTitle,metaTitle,metaDescription,slug,focusKeyword,secondaryKeywords:string[],searchIntent,h1," +
  "outline:{h2,h3:string[]}[],articleContent(HTML string),faq:{q,a}[],schemaRecommendation,imagePrompts:string[]," +
  "featuredImagePrompt,altText:string[],excerpt,tags:string[],category,socialCaptions:{platform,text}[]," +
  "newsletterSummary,cta,internalLinks:string[],externalLinks:string[],seoScore(0-100),readabilityScore(0-100)}";

function buildSystemPrompt(input: SeoArticleInput, minWords: number, health: boolean): string {
  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);
  const parts: string[] = [
    "You are an expert SEO content strategist and a careful educational writer. Return ONLY valid minified JSON matching this TypeScript type: " +
      JSON_SHAPE + ".",
    "articleContent must be well-structured HTML using h2/h3/p/ul/ol (no h1, no scripts, no inline styles). Write genuinely useful, original content for people — not keyword stuffing.",
    `Today's date is ${today}. Never present an earlier year as current. If a year appears in the title it must be ${year}.`,
    "category: a short blog category for this article (1-3 words, Title Case, e.g. \"Buying Guides\" or \"Soil Health\"). Never \"Blog\", \"General\" or \"Uncategorized\".",
    `LENGTH: articleContent MUST contain at least ${minWords} words of real substance (aim for ${minWords + 300}). Do not pad with filler.`,
    "STRUCTURE (strict): the page title is the H1, so do NOT include an h1. Open with a 100-150 word introduction in <p> tags (no heading) that uses the focus keyword in the first sentence. " +
      "Then <h2>Key takeaways</h2> with a <ul> of 4-6 points. Then 6-9 more <h2> sections, each 150-350 words, each with 2-3 <h3> sub-sections where the topic allows. " +
      "Never skip heading levels and never use h4-h6. Headings must be descriptive, unique and written for people, with natural keyword variations. " +
      "Use <ul>/<ol> for lists and at least one <table> (with <thead>/<tbody>) for a comparison or summary where it helps. " +
      "Finish with <h2>Conclusion</h2> — a short summary that adds no new claims.",
    "KEYWORDS: build the article around the focus keyword plus 8-12 closely related secondary keywords (semantic variations, questions people really search). Use the focus keyword in the H1, within the first 100 words, in a few h2s and in the meta description, naturally. metaDescription ≤ 155 characters; metaTitle ≤ 60 characters.",
    "FAQ: 6-8 genuinely common questions with direct, accurate 2-4 sentence answers.",
    "IMAGE: featuredImagePrompt must describe ONE realistic editorial photograph (no text, no logos, no recognizable real people) that fits the topic.",
  ];
  if (input.targetCountry && input.targetCountry.trim()) {
    parts.push(`AUDIENCE: primarily readers in ${input.targetCountry}, but keep the content accurate and useful internationally.`);
  } else {
    parts.push(
      "AUDIENCE: readers WORLDWIDE, in every country. Do not assume one country's laws, prices, healthcare system, units or slang. Use clear international English, give metric and imperial units where relevant, and say explicitly when guidance, regulations or availability differ between countries or regions. Prefer international bodies and global evidence over single-country sources."
    );
  }
  if (input.language && input.language.toLowerCase() !== "en") {
    parts.push(`LANGUAGE: write the ENTIRE package (title, headings, body, FAQ, meta text) in the language with code "${input.language}". Do not mix languages.`);
  }
  const bc = input.brandContext;
  if (bc && (bc.name || bc.summary)) {
    parts.push(
      `BRAND: you are writing for ${bc.name || "the brand"}${bc.summary ? ` — ${bc.summary}` : ""}. ` +
        (bc.audience ? `Audience: ${bc.audience}. ` : "") +
        (bc.tone ? `Voice: ${bc.tone}. ` : "") +
        (bc.offerings?.length ? `Where it genuinely helps the reader, mention the brand's relevant offerings (${bc.offerings.join("; ")}) naturally in one or two places — never a hard sell, never invented prices, claims, awards or testimonials. ` : "") +
        "Write as the brand's own expert voice."
    );
  }
  if (input.rules?.trim()) {
    parts.push(
      `BUSINESS RULES (hard facts about how this business really operates — follow them exactly): ${input.rules.trim().slice(0, 1500)}\n` +
        "Never contradict these rules. Never recommend or imply anything the business does not offer (for example samples, discounts, payment methods, services or guarantees that are not listed), and never invent policies, prices, lead times or guarantees. If general buying advice would normally suggest something the rules rule out, give the advice in a way that fits the rules instead."
    );
  }
  if (input.angle?.trim()) {
    parts.push(`ANGLE: ${input.angle.trim()} The article must cover the topic more completely and more usefully than the pages that already rank for it — specific, practical, no filler.`);
  }
  if (input.internalLinks?.length) {
    parts.push(
      "INTERNAL LINKS: where it is genuinely relevant, link to 2-4 of these pages of the same website (natural anchor text, never 'click here'). Use ONLY these URLs, copied exactly, and add no other links of any kind: " +
        input.internalLinks.slice(0, 25).map((l) => `${l.title} → ${l.url}`).join(" | ")
    );
  }
  if (health) {
    parts.push(
      "HEALTH & MEDICAL RULES (strict): this is educational health information, never personal medical advice. " +
        "Explain what the evidence generally shows, with appropriate uncertainty. " +
        "NEVER fabricate studies, statistics, quotes, authors, journal names or URLs — if you are not certain a specific figure exists, describe the finding in general terms instead. " +
        "Refer to well-known reputable organisations by name where relevant (for example the WHO, NIH, CDC, NHS, Mayo Clinic, Cochrane). " +
        "externalLinks: include ONLY links you are highly confident exist, preferably top-level pages or established topic hubs of those organisations; otherwise return an empty array. " +
        "Do NOT give diagnoses, personalised treatment plans, or specific medication doses. Do NOT promise cures or guaranteed outcomes, and never tell readers to stop medication or avoid a doctor. " +
        "Encourage readers to consult a qualified healthcare professional for their own situation. Write in a calm, neutral, evidence-based tone. " +
        "Do not add a disclaimer yourself — it is added automatically."
    );
  }
  return parts.join(" ");
}

/** Keep only links to the allowed URLs (and in-page #anchors); other links become plain text. */
export function restrictLinks(html: string, allowed: string[]): string {
  const norm = (u: string) => u.replace(/[#?].*$/, "").replace(/\/+$/, "").toLowerCase();
  const ok = new Set(allowed.map(norm));
  return html.replace(/<a\b[^>]*\shref=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (full, href: string, inner: string) => {
    if (href.startsWith("#")) return full;
    return ok.has(norm(href)) ? full : inner;
  });
}

function stripFences(text: string): string {
  const t = text.trim().replace(/^```json?/i, "").replace(/```$/, "").trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  return first >= 0 && last > first ? t.slice(first, last + 1) : t;
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Keep outputs sane: required arrays exist, no example.com links, current-year titles. */
function normalize(pkg: SeoPackage, input: SeoArticleInput): SeoPackage {
  const kw = input.mainKeyword.trim();
  const year = new Date().getFullYear();
  const fixYear = (s: string | undefined) =>
    (s ?? "").replace(/\b(20\d{2})\b/g, (m) => (Number(m) < year && /guide|edition|update|complete|best|top|checklist|handbook/i.test(s ?? "") ? String(year) : m));
  return {
    ...pkg,
    seoTitle: fixYear(pkg.seoTitle),
    metaTitle: fixYear(pkg.metaTitle),
    h1: fixYear(pkg.h1),
    metaDescription: (pkg.metaDescription ?? "").slice(0, 160),
    slug: slugify(pkg.slug || kw),
    focusKeyword: pkg.focusKeyword || kw,
    secondaryKeywords: arr<string>(pkg.secondaryKeywords),
    outline: arr<{ h2: string; h3: string[] }>(pkg.outline),
    faq: arr<{ q: string; a: string }>(pkg.faq).filter((f) => f && f.q && f.a),
    imagePrompts: arr<string>(pkg.imagePrompts),
    altText: arr<string>(pkg.altText),
    tags: arr<string>(pkg.tags),
    socialCaptions: arr<{ platform: string; text: string }>(pkg.socialCaptions),
    internalLinks: arr<string>(pkg.internalLinks),
    externalLinks: arr<string>(pkg.externalLinks).filter((u) => /^https?:\/\//i.test(u) && !/example\.(com|org|net)/i.test(u)),
    featuredImagePrompt: pkg.featuredImagePrompt || "",
  };
}

export async function generateSeoPackage(
  input: SeoArticleInput,
  opts: { strict?: boolean } = {}
): Promise<{ pkg: SeoPackage; usedAI: boolean }> {
  const strict = opts.strict === true;
  if (!willUseRealSeoAI()) {
    if (strict) throw new SeoGenerationError("ANTHROPIC_API_KEY is not set.");
    return { pkg: placeholder(input), usedAI: false };
  }

  const minWords = Math.min(MAX_MIN_WORDS, Math.max(300, input.minWords ?? input.wordCount ?? DEFAULT_MIN_WORDS));
  const health = isHealthTopic(input.mainKeyword, input.niche, ...(input.secondaryKeywords ?? []));
  const system = buildSystemPrompt(input, minWords, health);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const model = input.model || MODEL;

  let revision = "";
  let lastErr = "no attempt made";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const stream = client.messages.stream({
        model,
        max_tokens: 12000,
        system,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              mainKeyword: input.mainKeyword,
              secondaryKeywords: input.secondaryKeywords,
              niche: input.niche,
              targetCountry: input.targetCountry,
              targetAudience: input.targetAudience,
              searchIntent: input.searchIntent,
              articleType: input.articleType,
              tone: input.tone,
              minWords,
              angle: input.angle,
              language: input.language,
              brandName: input.brandName,
              productName: input.productName,
              cta: input.cta,
              ...(revision ? { revisionInstruction: revision } : {}),
            }),
          },
        ],
      });
      const msg = await stream.finalMessage();
      const text = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      const raw = JSON.parse(stripFences(text)) as SeoPackage;
      if (typeof raw.articleContent !== "string" || !raw.articleContent.trim()) {
        lastErr = "the model returned no article body";
        revision = "Your previous reply had no articleContent. Return the complete JSON including a full articleContent.";
        continue;
      }

      const words = countWords(raw.articleContent);
      if (words < minWords) {
        lastErr = `article too short (${words} of ${minWords} words)`;
        revision = `Your previous draft had only ${words} words. Return the complete JSON again with a longer, deeper articleContent of AT LEAST ${minWords} words — expand sections with evidence, examples and practical detail, not filler.`;
        continue;
      }

      const structure = analyzeStructure(raw.articleContent);
      // One rewrite for structure problems; on the second draft accept it (length and
      // safety are still enforced) rather than throwing away an otherwise good article.
      if (!structure.ok && attempt === 0) {
        lastErr = `weak heading structure (${structure.issues.join("; ")})`;
        revision = `Your previous draft has heading-structure problems: ${structure.issues.join("; ")}. Return the complete JSON again fixing them, following the STRUCTURE rules exactly and keeping at least ${minWords} words.`;
        continue;
      }
      // When real pages were offered for internal linking, remove any other link the AI
      // may have added (it must never invent URLs).
      if (input.internalLinks) raw.articleContent = restrictLinks(raw.articleContent, input.internalLinks.map((l) => l.url));
      raw.articleContent = addHeadingAnchorsAndToc(raw.articleContent);

      if (health) {
        const risky = findRiskyHealthClaims(raw.articleContent);
        if (risky.length) {
          lastErr = `unsafe health claims (${risky.join("; ")})`;
          revision = `Your previous draft ${risky.join("; ")}. Rewrite the complete JSON without those claims, keeping an educational, evidence-based tone and at least ${minWords} words.`;
          continue;
        }
        raw.articleContent = withMedicalDisclaimer(raw.articleContent);
      }

      return { pkg: normalize(raw, input), usedAI: true };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "generation failed";
      revision = "";
    }
  }

  if (strict) throw new SeoGenerationError(`Could not produce a publishable article: ${lastErr}`);
  return { pkg: placeholder(input), usedAI: false };
}
