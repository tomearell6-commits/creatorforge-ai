/**
 * AI Business Operations Manager — generation engine.
 * Claude when ANTHROPIC_API_KEY is set; deterministic placeholders otherwise
 * (free — no credits charged). Every generator injects the company profile +
 * active Knowledge Base so outputs speak with the business's own voice.
 * Batched calls only (serverless 60s budget).
 */
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { SENSITIVE_INQUIRY_KEYWORDS, type DocumentTypeId } from "@/config/businessOps";
import type { ProfileLike } from "@/lib/business/profile";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export function willUseRealBusinessAI(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

async function callClaude<T>(system: string, payload: unknown, maxTokens = 2000): Promise<T> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });
  const text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : text) as T;
}

/** Company context injected into every prompt (profile + knowledge, capped). */
export async function buildCompanyContext(userId: string): Promise<string> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: knowledge }] = await Promise.all([
    admin.from("company_profiles").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("business_knowledge").select("kind, title, content").eq("user_id", userId).eq("is_active", true).limit(10),
  ]);
  const parts: string[] = [];
  if (profile) {
    parts.push(
      `Company: ${profile.company_name || "—"} | Industry: ${profile.industry || "—"} | Voice: ${profile.brand_voice || "professional"}`,
      profile.description ? `About: ${profile.description}` : "",
      profile.target_market ? `Target market: ${profile.target_market}` : "",
      profile.products_summary ? `Products: ${profile.products_summary}` : "",
      profile.services_summary ? `Services: ${profile.services_summary}` : "",
      profile.mission ? `Mission: ${profile.mission}` : ""
    );
  }
  for (const k of knowledge ?? []) {
    parts.push(`[${k.kind}] ${k.title}: ${String(k.content).slice(0, 1200)}`);
  }
  return parts.filter(Boolean).join("\n").slice(0, 9000);
}

// ---- Profile optimization ---------------------------------------------------

export type ProfileOptimization = {
  summary: string;
  seoKeywords: string[];
  improvedDescription: string;
  recommendations: { area: string; advice: string }[];
};

export async function optimizeProfile(profile: ProfileLike): Promise<{ result: ProfileOptimization; usedAI: boolean }> {
  if (!willUseRealBusinessAI()) {
    return {
      usedAI: false,
      result: {
        summary: "Placeholder analysis — connect the AI key for a full review. Focus on the missing fields listed by the completeness checker.",
        seoKeywords: [profile.industry || "your industry", "near me", (profile.company_name || "your company").toLowerCase()],
        improvedDescription: profile.description || "Describe what you do, who you serve, and why customers choose you.",
        recommendations: [
          { area: "Description", advice: "Lead with the outcome you deliver, then how, then proof." },
          { area: "SEO", advice: "Work your top service + location into the first sentence." },
        ],
      },
    };
  }
  const result = await callClaude<ProfileOptimization>(
    `You are a business-profile optimization expert for CreatorsForge.io. Given a company profile JSON, return STRICT JSON:
{"summary": "2-3 sentence assessment", "seoKeywords": ["6-10 keywords"], "improvedDescription": "rewritten description, 2-4 sentences, keep facts — NEVER invent claims", "recommendations": [{"area": "...", "advice": "specific, actionable"}] (5-8 items)}`,
    profile,
    1600
  );
  return { result, usedAI: true };
}

// ---- Product marketing pack --------------------------------------------------

export type ProductPack = {
  seoDescription: string;
  marketingCopy: string;
  socialCaptions: { platform: string; caption: string }[];
  faq: { q: string; a: string }[];
  comparisonPoints: string[];
  imagePrompt: string;
  videoPrompt: string;
};

export async function generateProductPack(
  product: { name: string; category?: string | null; price?: number | null; description?: string | null; specifications?: Record<string, string> },
  context: string
): Promise<{ result: ProductPack; usedAI: boolean }> {
  if (!willUseRealBusinessAI()) {
    return {
      usedAI: false,
      result: {
        seoDescription: `${product.name} — ${product.description || "quality you can rely on"}.`,
        marketingCopy: `Meet ${product.name}: built for customers who want results. ${product.description || ""}`,
        socialCaptions: [
          { platform: "Instagram", caption: `New: ${product.name} ✨ DM us to order.` },
          { platform: "Facebook", caption: `${product.name} is here — message us for details.` },
        ],
        faq: [{ q: `What is ${product.name}?`, a: product.description || "Ask us anything — we reply fast." }],
        comparisonPoints: ["Quality", "Price", "Support"],
        imagePrompt: `Professional studio product photo of ${product.name}, clean background, soft lighting`,
        videoPrompt: `15-second product showcase of ${product.name}, close-ups, upbeat`,
      },
    };
  }
  const result = await callClaude<ProductPack>(
    `You create product marketing packs. Use ONLY facts provided — never invent specs, prices or claims. Company context:\n${context}\nReturn STRICT JSON: {"seoDescription": "150-160 chars", "marketingCopy": "2 short paragraphs", "socialCaptions": [{"platform": "Instagram|Facebook|LinkedIn|TikTok", "caption": "..."}] (4), "faq": [{"q": "...", "a": "..."}] (4-6), "comparisonPoints": ["5-7 differentiators"], "imagePrompt": "AI image prompt for a product photo", "videoPrompt": "AI video prompt, 15-30s"}`,
    product,
    2200
  );
  return { result, usedAI: true };
}

// ---- Inquiry triage + drafts --------------------------------------------------

export type InquiryTriage = {
  index: number;
  category: "sales" | "support" | "general" | "partnership" | "quotation" | "appointment";
  priority: "low" | "normal" | "high" | "critical";
  isSensitive: boolean;
  summary: string;
  recommendation: string;
};

export function inquiryLooksSensitive(text: string): boolean {
  const lower = (text || "").toLowerCase();
  return SENSITIVE_INQUIRY_KEYWORDS.some((k) => lower.includes(k));
}

function triageHeuristic(inq: { subject: string; message: string }, index: number): InquiryTriage {
  const text = `${inq.subject} ${inq.message}`.toLowerCase();
  const category =
    /quote|quotation|pricing|price list/.test(text) ? "quotation" :
    /partner|collab|reseller|distribut/.test(text) ? "partnership" :
    /appointment|meeting|call|schedule/.test(text) ? "appointment" :
    /broken|issue|problem|help|not working/.test(text) ? "support" :
    /buy|order|purchase|interested/.test(text) ? "sales" : "general";
  const sensitive = inquiryLooksSensitive(text);
  const priority = sensitive ? "high" : category === "sales" || category === "quotation" ? "high" : "normal";
  return {
    index, category, priority, isSensitive: sensitive,
    summary: inq.subject || inq.message.slice(0, 80),
    recommendation: sensitive
      ? "Sensitive topic — review personally before replying."
      : "Draft a reply and respond within 24 hours.",
  };
}

export async function triageInquiries(
  inquiries: { subject: string; message: string; customerName?: string | null }[],
  context: string
): Promise<{ results: InquiryTriage[]; usedAI: boolean }> {
  if (inquiries.length === 0) return { results: [], usedAI: false };
  if (!willUseRealBusinessAI()) {
    return { results: inquiries.map((q, i) => triageHeuristic(q, i)), usedAI: false };
  }
  const results = await callClaude<InquiryTriage[]>(
    `You triage business inquiries for the company below. For EACH inquiry return an array item with STRICT JSON shape:
{"index": n, "category": "sales|support|general|partnership|quotation|appointment", "priority": "low|normal|high|critical", "isSensitive": bool (true for refunds/legal/disputes/complaints/data requests), "summary": "one line", "recommendation": "one actionable line"}
Return a JSON array only, one item per inquiry, same order.\nCompany context:\n${context}`,
    inquiries.map((q, index) => ({ index, subject: q.subject, message: q.message.slice(0, 1500), customer: q.customerName })),
    2400
  );
  // Safety: AI may only ADD sensitivity, never remove the keyword flag.
  return {
    usedAI: true,
    results: inquiries.map((q, i) => {
      const r = results.find((x) => x.index === i) ?? triageHeuristic(q, i);
      return { ...r, isSensitive: r.isSensitive || inquiryLooksSensitive(`${q.subject} ${q.message}`) };
    }),
  };
}

export async function draftInquiryReply(
  inquiry: { subject: string; message: string; customerName?: string | null; category?: string | null },
  tone: string,
  context: string
): Promise<{ draft: string; usedAI: boolean }> {
  if (!willUseRealBusinessAI()) {
    return {
      usedAI: false,
      draft: `Hi ${inquiry.customerName || "there"},\n\nThank you for reaching out about "${inquiry.subject}". We've received your message and will get back to you with full details shortly.\n\nBest regards`,
    };
  }
  const result = await callClaude<{ draft: string }>(
    `You draft professional business replies in a ${tone} tone. Use ONLY facts from the company context — if information is missing, promise a follow-up instead of inventing it. Never commit to prices, refunds, legal terms or contracts. Return STRICT JSON {"draft": "the reply, plain text, ready to send"}.\nCompany context:\n${context}`,
    inquiry,
    1200
  );
  return { draft: result.draft, usedAI: true };
}

// ---- Document generation --------------------------------------------------------

export type BusinessDocument = {
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
  lineItems?: { description: string; qty: number; unitPrice: number }[];
  terms: string;
  footer: string;
};

export async function generateDocument(
  docType: DocumentTypeId,
  brief: { title: string; recipient?: string; details: string; items?: { description: string; qty: number; unitPrice: number }[] },
  context: string
): Promise<{ result: BusinessDocument; usedAI: boolean }> {
  if (!willUseRealBusinessAI()) {
    return {
      usedAI: false,
      result: {
        title: brief.title,
        intro: `This ${docType.replace(/_/g, " ")} is prepared for ${brief.recipient || "the client"}.`,
        sections: [{ heading: "Details", body: brief.details }],
        lineItems: brief.items,
        terms: "Valid for 30 days. Prices exclude taxes unless stated.",
        footer: "Generated with CreatorsForge.io — review before sending.",
      },
    };
  }
  const result = await callClaude<BusinessDocument>(
    `You draft professional business documents (type: ${docType}). Use ONLY the provided facts and company context — NEVER invent prices, legal clauses beyond standard boilerplate, or commitments. Contract templates must carry a "have a lawyer review" note in terms. Return STRICT JSON:
{"title": "...", "intro": "...", "sections": [{"heading": "...", "body": "..."}] (3-6), "lineItems": [{"description": "...", "qty": n, "unitPrice": n}] (echo/clean provided items or omit), "terms": "...", "footer": "..."}\nCompany context:\n${context}`,
    brief,
    2400
  );
  return { result: { ...result, lineItems: result.lineItems ?? brief.items }, usedAI: true };
}

// ---- Business report -------------------------------------------------------------

export type BusinessReportContent = {
  headline: string;
  narrative: string;
  wins: string[];
  concerns: string[];
  nextActions: string[];
};

export async function narrateReport(
  reportType: string,
  metrics: Record<string, unknown>,
  context: string
): Promise<{ result: BusinessReportContent; usedAI: boolean }> {
  if (!willUseRealBusinessAI()) {
    return {
      usedAI: false,
      result: {
        headline: `${reportType} report`,
        narrative: "Placeholder narrative — metrics below are real; connect the AI key for written analysis.",
        wins: [], concerns: [], nextActions: ["Review the metrics and pick one improvement for next period."],
      },
    };
  }
  const result = await callClaude<BusinessReportContent>(
    `You write concise business reports from REAL metrics — never invent numbers, only interpret the ones given. Return STRICT JSON {"headline": "...", "narrative": "2-3 paragraphs", "wins": ["..."], "concerns": ["..."], "nextActions": ["3-5 specific actions"]}.\nCompany context:\n${context}`,
    { reportType, metrics },
    1800
  );
  return { result, usedAI: true };
}
