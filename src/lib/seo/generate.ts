/**
 * SEO Content Studio generator. Produces a full SEO blog package as structured
 * JSON. Uses Claude when ANTHROPIC_API_KEY is set; otherwise a deterministic
 * placeholder so the flow always works (no credits charged for placeholder).
 */
import Anthropic from "@anthropic-ai/sdk";

export type SeoArticleInput = {
  mainKeyword: string;
  secondaryKeywords?: string[];
  targetCountry?: string;
  targetAudience?: string;
  searchIntent?: string;
  articleType?: string;
  tone?: string;
  wordCount?: number;
  language?: string;
  brandName?: string;
  productName?: string;
  cta?: string;
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

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
}
function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
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
    `\n<p>${input.cta || `Ready to get started? Try ${input.productName || input.brandName || "CreatorForge"} today.`}</p>`;

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
    cta: input.cta || `Try ${input.productName || input.brandName || "CreatorForge"} today.`,
    internalLinks: [`/blog/${slugify(secondary[0] || kw)}`],
    externalLinks: ["https://example.com/authoritative-source"],
    seoScore: 78,
    readabilityScore: 72,
  };
}

export function willUseRealSeoAI(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function generateSeoPackage(input: SeoArticleInput): Promise<{ pkg: SeoPackage; usedAI: boolean }> {
  if (!willUseRealSeoAI()) return { pkg: placeholder(input), usedAI: false };
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system:
        "You are an expert SEO content strategist and writer. Return ONLY valid minified JSON matching this TypeScript type: " +
        "{seoTitle,metaTitle,metaDescription,slug,focusKeyword,secondaryKeywords:string[],searchIntent,h1," +
        "outline:{h2,h3:string[]}[],articleContent(HTML string),faq:{q,a}[],schemaRecommendation,imagePrompts:string[]," +
        "featuredImagePrompt,altText:string[],excerpt,tags:string[],category,socialCaptions:{platform,text}[]," +
        "newsletterSummary,cta,internalLinks:string[],externalLinks:string[],seoScore(0-100),readabilityScore(0-100)}. " +
        "articleContent must be well-structured HTML using h2/h3/p/ul. Write genuinely useful, original content.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            mainKeyword: input.mainKeyword,
            secondaryKeywords: input.secondaryKeywords,
            targetCountry: input.targetCountry,
            targetAudience: input.targetAudience,
            searchIntent: input.searchIntent,
            articleType: input.articleType,
            tone: input.tone,
            wordCount: input.wordCount,
            language: input.language,
            brandName: input.brandName,
            productName: input.productName,
            cta: input.cta,
          }),
        },
      ],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^```json?/i, "")
      .replace(/```$/, "");
    const pkg = JSON.parse(text) as SeoPackage;
    return { pkg, usedAI: true };
  } catch {
    return { pkg: placeholder(input), usedAI: false };
  }
}
