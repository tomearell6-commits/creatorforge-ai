/**
 * Website analysis for SEO Autopilot (server-only).
 *
 *   1. Read the site (home + a few key pages)               — what the business is
 *   2. AI brand profile (offer, audience, tone, seed keywords)
 *   3. Search the web for those keywords                    — who really ranks, right now
 *   4. Read the best-ranking competitor pages               — what ranking pages cover
 *   5. AI strategy: keywords to win, content gaps, a 30-day plan
 *
 * Honest limits: we see real search results at analysis time and the structure of the
 * pages that rank, but NOT search volumes or difficulty scores (those need a paid keyword
 * data source). Nothing here guarantees a ranking.
 */
import { screenSiteContent, PolicyBlockedError } from "@/lib/seo/policy";
import Anthropic from "@anthropic-ai/sdk";
import { validateAuditUrl } from "@/lib/seo-audit/ssrf";
import { fcScrape, fcSearch, hasFirecrawl } from "./firecrawl";
import {
  cleanMarkdown, extractHeadings, hostOf, pickInternalPages, pickPagesToStudy,
  summarizeCompetitors, wordCountOf, type SerpForKeyword,
} from "./evidence";
import { filterNewTopics, type Topic } from "@/lib/seo/autopost/topics";
import { isHealthTopic } from "@/lib/seo/health";

export type Brand = {
  name: string; summary: string; niche: string; businessType: string;
  offerings: string[]; audience: string; tone: string; country: string; language: string; isHealthRelated: boolean;
  /** How the business really sells (from its own pages); the writer must not contradict these. */
  rules?: string[];
};
export type Competitor = { domain: string; rank: number; topPage: string; whyTheyRank: string };
export type KeywordIdea = { keyword: string; intent: string; why: string };
export type PlanItem = { day: number; title: string; keyword: string; secondaryKeywords: string[]; intent: string; angle: string };
export type AnalysisResult = { brand: Brand; competitors: Competitor[]; keywords: KeywordIdea[]; gaps: string[]; plan: PlanItem[] };

type Progress = (message: string) => Promise<void> | void;

const MODEL = () => process.env.SEO_RESEARCH_MODEL || "claude-sonnet-5-5";

async function askClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const stream = client.messages.stream({ model: MODEL(), max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] });
  const msg = await stream.finalMessage();
  return msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
}

function parseJson<T>(text: string): T {
  const t = text.trim().replace(/^```json?/i, "").replace(/```$/, "").trim();
  const first = t.search(/[[{]/);
  const last = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  return JSON.parse(first >= 0 && last > first ? t.slice(first, last + 1) : t) as T;
}

/** Read JSON from an answer-producing function; a malformed answer is asked for again (up to `tries`). */
export async function readJsonWithRetry<T>(ask: () => Promise<string>, tries: number): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return parseJson<T>(await ask());
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      lastErr = e;
    }
  }
  console.error("[seo-analysis] model returned unreadable JSON after retries:", lastErr);
  throw new Error("The analysis didn't come back in a readable form. Please try again — no credits were charged.");
}

/**
 * Ask Claude for a result object by making it CALL A TOOL. Tool input arrives already parsed by the API,
 * so a stray quote or comma in a long answer can no longer break the analysis (the failure that happened
 * with free-text JSON). Throws a SyntaxError when no usable object came back.
 */
async function askViaTool(system: string, user: string, maxTokens: number, trace: string[] = [], label = "call"): Promise<Record<string, unknown>> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const stream = client.messages.stream({
    model: MODEL(),
    max_tokens: maxTokens,
    system: system + " Deliver the result by calling the submit_result tool with the object described above. Never write the result as plain text.",
    messages: [{ role: "user", content: user }],
    tools: [{ name: "submit_result", description: "Submit the finished result object exactly as described in the instructions.", input_schema: { type: "object", additionalProperties: true } }],
    // "auto": forcing a specific tool is rejected by this model (HTTP 400); the instruction above makes it call the tool.
    tool_choice: { type: "auto" },
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "max_tokens") trace.push(`${label}: hit the output limit (max_tokens=${maxTokens}, output_tokens=${msg.usage?.output_tokens}); the result may be cut short`);
  const block = msg.content.find((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
  if (block && block.input && typeof block.input === "object" && !Array.isArray(block.input) && Object.keys(block.input).length > 0) {
    return block.input as Record<string, unknown>;
  }
  const blocks = msg.content.map((c) => c.type).join(",") || "none";
  const said = msg.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join(" ").replace(/\s+/g, " ").slice(0, 400);
  trace.push(`${label}: tool gave no object; stop_reason=${msg.stop_reason}; blocks=${blocks}; output_tokens=${msg.usage?.output_tokens}; model said: ${JSON.stringify(said)}`);
  console.error("[seo-analysis] tool call returned no usable object; stop_reason=", msg.stop_reason);
  throw new SyntaxError("no structured result");
}

/**
 * Get a result object from Claude. Order: structured tool call (reliable), then the same again for small
 * calls, then plain-text JSON as a last resort. The big plan call stays at 2 attempts so the whole job
 * fits its 5-minute limit.
 */
export async function askJson<T>(system: string, user: string, maxTokens: number, label = "call", trace: string[] = []): Promise<T> {
  const big = maxTokens > 4000;
  const strategies: (() => Promise<unknown>)[] = [
    () => askViaTool(system, user, maxTokens, trace, label),
    ...(big ? [] : [() => askViaTool(system, user, maxTokens, trace, label)]),
    () => readJsonWithRetry(async () => {
      const txt = await askClaude(system + " JSON RULES: output one valid minified JSON value and nothing else. Never put a double-quote character inside a text value (use a single quote), and never use line breaks inside values.", user, maxTokens);
      try { JSON.parse(txt.trim().replace(/^```json?/i, "").replace(/```$/, "").trim().replace(/^[^[{]*/, "")); } catch (err) {
        const pos = Number(/position (\d+)/.exec(err instanceof Error ? err.message : "")?.[1] ?? -1);
        trace.push(`${label}: text JSON invalid (${err instanceof Error ? err.message.slice(0, 120) : "?"}); length=${txt.length}; around error: ${pos >= 0 ? JSON.stringify(txt.slice(Math.max(0, pos - 80), pos + 80)) : JSON.stringify(txt.replace(/\s+/g, " ").slice(0, 400))}`);
      }
      return txt;
    }, 1),
  ];
  let lastErr: unknown;
  for (const run of strategies) {
    try {
      return (await run()) as T;
    } catch (e) {
      lastErr = e;
      if (!(e instanceof SyntaxError)) trace.push(`${label}: error status=${(e as { status?: number } | null)?.status ?? "-"} ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
      // A bad answer, or the API refusing the tool request (HTTP 400), is worth the next strategy; network/auth errors are not.
      const status = (e as { status?: number } | null)?.status;
      if (!(e instanceof SyntaxError) && status !== 400 && !(e instanceof Error && e.message.includes("readable form"))) throw e;
    }
  }
  console.error("[seo-analysis] no usable answer from the model:", lastErr);
  throw Object.assign(new Error("The analysis didn't come back in a readable form. Please try again — no credits were charged."), { diag: trace });
}

const str = (v: unknown, d = ""): string => (typeof v === "string" ? v.trim() : d);
const strs = (v: unknown, max: number): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim()).slice(0, max) : []);

/** Normalize what the user typed into a clean https origin, or throw a friendly error. */
export async function normalizeWebsite(input: string): Promise<string> {
  let raw = input.trim();
  if (!raw) throw new Error("Enter your website address.");
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const check = await validateAuditUrl(raw);
  if (!check.ok) throw new Error(check.error);
  const u = new URL(raw);
  return `${u.protocol}//${u.hostname}`;
}

export async function analyzeWebsite(origin: string, onProgress: Progress = () => {}): Promise<AnalysisResult> {
  if (!hasFirecrawl()) throw new Error("Website analysis isn't set up on this server yet (missing FIRECRAWL_API_KEY).");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Website analysis isn't set up on this server yet (missing ANTHROPIC_API_KEY).");
  const ownHost = hostOf(origin);
  const trace: string[] = []; // technical notes kept for diagnosing a failed analysis

  // 1) Read the site.
  await onProgress("Reading your website…");
  const home = await fcScrape(origin + "/", { full: true });
  if (!home) throw new Error("We couldn't read that website. Check the address, and that the site is public (not password-protected).");
  const extraUrls = pickInternalPages(origin, home.links, 3);
  const extras = (await Promise.all(extraUrls.map((u) => fcScrape(u)))).filter((x): x is NonNullable<typeof x> => !!x);
  const siteText = [
    `HOME (${origin}) title: ${home.title}\nmeta: ${home.description}\n${cleanMarkdown(home.markdown).slice(0, 7000)}`,
    ...extras.map((p) => `PAGE ${p.url} title: ${p.title}\n${cleanMarkdown(p.markdown).slice(0, 2300)}`),
  ].join("\n\n---\n\n");

  // 1b) Category check: we do not analyse or promote sites that sell illegal drugs (nothing is charged).
  if (screenSiteContent(`${home.title} ${home.description} ${siteText}`).blocked) throw new PolicyBlockedError();

  // 2) Brand profile.
  await onProgress("Learning your brand and customers…");
  const p = await askJson<Record<string, unknown>>(
    "You are a senior SEO strategist. From the website content, return ONLY minified JSON: " +
      "{name,summary(2 sentences, plain),niche(short phrase, max 100 chars, what the site is about),businessType(ecommerce|services|local|saas|publisher|other)," +
      "offerings:string[](max 8, the products or services),audience(who buys, 1 sentence),tone(2-4 words),country(ISO-2 code of the main market, or \"\" if global),language(ISO-639-1 code of the site language)," +
      "isHealthRelated:boolean,rules:string[](max 8 short plain statements of how this business really sells and what it does NOT offer, taken only from the site: minimum order quantities or values, payment methods, shipping and returns terms, whether samples are offered, custom work; empty array if the site says nothing),seedKeywords:string[](10 real search phrases real customers type: mix of buying-intent phrases like 'best X', 'X price', 'buy X', 'X near me', and informational ones)}. " +
      "Base everything on the content; never invent products the site does not offer.",
    siteText,
    2000,
    "profile",
    trace
  );
  const brand: Brand = {
    name: str(p.name, ownHost), summary: str(p.summary), niche: str(p.niche, str(p.summary)).slice(0, 120) || ownHost,
    businessType: str(p.businessType, "other"), offerings: strs(p.offerings, 8), audience: str(p.audience), tone: str(p.tone, "professional, helpful"),
    country: str(p.country).toLowerCase().slice(0, 2), language: str(p.language, "en").toLowerCase().slice(0, 5) || "en",
    rules: strs(p.rules, 8),
    isHealthRelated: p.isHealthRelated === true || isHealthTopic(str(p.niche), str(p.summary)),
  };
  const seeds = strs(p.seedKeywords, 12);
  if (seeds.length < 3) throw new Error("We couldn't work out what this website sells. Make sure the homepage describes your products or services.");

  // 3) Who ranks for those keywords, right now.
  await onProgress("Finding your real competitors on Google…");
  const country = /^[a-z]{2}$/.test(brand.country) ? brand.country : undefined;
  const serp: SerpForKeyword[] = (
    await Promise.all(seeds.slice(0, 6).map(async (keyword) => ({ keyword, hits: await fcSearch(keyword, { limit: 8, country }) })))
  ).filter((s) => s.hits.length > 0);
  if (serp.length === 0) throw new Error("We couldn't fetch search results right now. Please try again in a few minutes.");
  const competitors = summarizeCompetitors(serp, ownHost, 6);

  // 4) Read the pages that rank.
  await onProgress("Studying the pages that rank at the top…");
  const targets = pickPagesToStudy(serp, ownHost, 6);
  const studied = (
    await Promise.all(targets.map(async (t) => ({ t, page: await fcScrape(t.url) })))
  ).filter((x): x is { t: (typeof targets)[number]; page: NonNullable<Awaited<ReturnType<typeof fcScrape>>> } => !!x.page);

  const evidence = {
    brand,
    keywordsSearched: serp.map((s) => ({ keyword: s.keyword, top: s.hits.slice(0, 6).map((h, i) => ({ rank: i + 1, domain: hostOf(h.url), title: h.title })) })),
    competitors: competitors.map((c) => ({ domain: c.domain, appearances: c.appearances, bestRank: c.bestRank, keywords: c.keywords.slice(0, 4) })),
    studiedPages: studied.map(({ t, page }) => ({
      domain: hostOf(t.url), rank: t.rank, keyword: t.keyword, title: page.title,
      words: wordCountOf(page.markdown), headings: extractHeadings(page.markdown, 2).slice(0, 14),
    })),
    ownSiteHeadings: [...extractHeadings(home.markdown, 2), ...extras.flatMap((x) => extractHeadings(x.markdown, 2))].slice(0, 30),
  };

  // 5) Strategy + 30-day plan.
  await onProgress("Building your 30-day content plan…");
  const s = await askJson<Record<string, unknown>>(
    "You are a senior SEO strategist planning content that can win real search traffic. Using ONLY the evidence given (real search results and the real headings of top-ranking pages), return ONLY minified JSON: " +
      "{keywords:[{keyword,intent(commercial|transactional|informational|problem),why}](16-20, the best keywords for THIS business to win),gaps:string[](6-8 topics the top pages cover that this site does not),competitorInsights:[{domain,whyTheyRank}](one per competitor, based on their page depth and coverage; never claim backlink or traffic numbers),plan:[{day,title,keyword,secondaryKeywords:string[](4-8),intent,angle}](EXACTLY 30 items, day 1..30)}. " +
      "PLAN RULES: about 45% buyer-focused (best X, X vs Y, X price/cost, where to buy X, how to choose X, X reviews/alternatives), about 35% informational how-it-works/explainers, about 20% problem-and-solution. " +
      "Each title must promise something more useful than what already ranks (cover the topic more completely, add practical detail). Titles must be distinct, specific and natural — no clickbait, no year in the title, no competitor brand names unless it is an honest comparison. " +
      "Every keyword must be a real phrase people search, with worldwide relevance unless the business is local. " +
      (brand.isHealthRelated
        ? "This is a HEALTH-RELATED business: favour medical and educational-research keywords (conditions, causes, how it works, prevention, what the research shows, safety, when to see a doctor). Educational only — never plan content that promises cures, gives dosing or treatment advice, or promotes a drug. "
        : "") +
      "Do not invent search volumes or rankings.",
    JSON.stringify(evidence),
    16000,
    "plan",
    trace
  );

  const insights = new Map<string, string>();
  for (const i of (Array.isArray(s.competitorInsights) ? s.competitorInsights : []) as Record<string, unknown>[]) insights.set(str(i.domain).replace(/^www\./, ""), str(i.whyTheyRank));

  const rawPlan = (Array.isArray(s.plan) ? s.plan : []) as Record<string, unknown>[];
  const asTopics: (Topic & { angle: string })[] = rawPlan
    .map((r) => ({ keyword: str(r.keyword), title: str(r.title, str(r.keyword)), secondaryKeywords: strs(r.secondaryKeywords, 8), intent: str(r.intent, "informational"), angle: str(r.angle) }))
    .filter((t) => t.keyword);
  const unique = filterNewTopics(asTopics, [], 0.7) as (Topic & { angle: string })[];
  if (unique.length < 10) {
    trace.push(`plan: only ${unique.length} usable topics of ${rawPlan.length} returned; keys=${Object.keys(s).join(",")}`);
    throw Object.assign(new Error("The plan came back too short. Please try the analysis again."), { diag: trace });
  }
  const plan: PlanItem[] = unique.slice(0, 30).map((t, i) => ({ day: i + 1, title: t.title, keyword: t.keyword, secondaryKeywords: t.secondaryKeywords, intent: t.intent, angle: (t as { angle?: string }).angle ?? "" }));

  return {
    brand,
    competitors: competitors.map((c) => ({ domain: c.domain, rank: c.bestRank, topPage: c.topPage, whyTheyRank: insights.get(c.domain) ?? "" })),
    keywords: ((Array.isArray(s.keywords) ? s.keywords : []) as Record<string, unknown>[])
      .map((k) => ({ keyword: str(k.keyword), intent: str(k.intent, "informational"), why: str(k.why) }))
      .filter((k) => k.keyword)
      .slice(0, 20),
    gaps: strs(s.gaps, 8),
    plan,
  };
}
