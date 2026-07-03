/**
 * Build Studio package generator. One Claude call produces the complete
 * structured BuildPackage (positioning → structure → copy → features → flow →
 * sitemap → SEO → tech stack → roadmap → marketing plan). Deterministic
 * placeholder when no API key (free). One batched call keeps generation well
 * inside the serverless time budget.
 */
import Anthropic from "@anthropic-ai/sdk";
import { BUILD_DISCLAIMER, type BuildPackage, type BuildPage } from "./package";

export { BUILD_DISCLAIMER, packageToMarkdown } from "./package";
export type { BuildPackage, BuildPage, BuildFeature, RoadmapPhase } from "./package";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export function willUseRealBuildAI(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export type BuildInput = {
  projectType: string;    // display name
  group: string;          // website|ecommerce|landing|webapp|mobile|funnel
  idea: string;
  targetAudience?: string;
  goal?: string;
  style?: string;
};




// ---- Placeholder ------------------------------------------------------------
function placeholder(input: BuildInput): BuildPackage {
  const name = input.idea.split(/\s+/).slice(0, 3).map((w) => w.replace(/[^a-zA-Z0-9]/g, "")).join(" ") || input.projectType;
  const isApp = input.group === "webapp" || input.group === "mobile";
  const pages: BuildPage[] = (isApp
    ? ["Landing", "Signup", "Dashboard", "Settings", "Billing"]
    : input.group === "landing" || input.group === "funnel"
      ? ["Landing Page", "Thank You"]
      : ["Homepage", "About", "Services", "Pricing", "Contact"]
  ).map((p, i) => ({
    pageName: p, purpose: `${p} for ${input.projectType.toLowerCase()}`,
    sections: i === 0 ? ["Hero", "Social proof", "Benefits", "How it works", "CTA"] : ["Header", "Content", "CTA"],
    copy: {
      headline: i === 0 ? `${name}: ${input.goal ?? "grow"} made simple` : p,
      subhead: `Built for ${input.targetAudience ?? "your audience"}.`,
      cta: input.goal === "Leads" ? "Get your free consultation" : "Get started",
    },
  }));
  return {
    projectNameIdeas: [name, `${name} HQ`, `${name} Pro`],
    brandPositioning: `${input.projectType} for ${input.targetAudience ?? "modern customers"} — ${input.idea.slice(0, 120)}.`,
    targetAudience: input.targetAudience ?? "Define your primary audience segment.",
    structureOverview: `A ${input.style ?? "modern"} ${input.projectType.toLowerCase()} organized around ${input.goal?.toLowerCase() ?? "conversion"}.`,
    pages,
    features: [
      { name: "Core offering", description: input.idea.slice(0, 140), priority: "must", phase: 1 },
      { name: "Contact / conversion path", description: `Primary ${input.goal?.toLowerCase() ?? "conversion"} flow`, priority: "must", phase: 1 },
      { name: "Analytics", description: "Traffic + conversion tracking", priority: "should", phase: 2 },
      { name: "Content hub", description: "Blog / resources for SEO", priority: "later", phase: 3 },
    ],
    userFlow: ["Visitor lands on homepage", "Scans hero + social proof", "Explores offering", `Takes the ${input.goal?.toLowerCase() ?? "primary"} action`, "Receives confirmation + follow-up"],
    sitemap: pages.map((p) => ({ path: `/${p.pageName.toLowerCase().replace(/\s+/g, "-").replace("homepage", "")}`, label: p.pageName })),
    ctaStrategy: `One primary CTA per page focused on ${input.goal?.toLowerCase() ?? "conversion"}; secondary low-commitment CTA (learn more / see examples).`,
    seoKeywords: [input.projectType.toLowerCase(), `${input.projectType.toLowerCase()} for ${(input.targetAudience ?? "businesses").toLowerCase()}`, `best ${input.projectType.toLowerCase()}`],
    blogTopics: [`How to choose a ${input.projectType.toLowerCase()}`, `${input.projectType} trends this year`, `Case study: results with ${name}`],
    uiComponentPlan: ["Navbar", "Hero", "Feature cards", "Testimonial slider", "Pricing table", "FAQ accordion", "Footer"],
    databaseSuggestion: isApp
      ? [
          { table: "users", purpose: "Accounts + auth", keyFields: ["id", "email", "role", "created_at"] },
          { table: "subscriptions", purpose: "Billing state", keyFields: ["id", "user_id", "plan", "status"] },
          { table: "core_records", purpose: "The app's main entity", keyFields: ["id", "user_id", "data", "created_at"] },
        ]
      : [{ table: "leads", purpose: "Form submissions", keyFields: ["id", "name", "email", "message", "created_at"] }],
    techStack: [
      { layer: "Frontend", recommendation: isApp ? "Next.js + Tailwind" : "Next.js or a site builder (Webflow/Framer)", reason: "Fast, SEO-friendly, huge ecosystem" },
      { layer: "Backend/DB", recommendation: "Supabase (Postgres + Auth)", reason: "Auth, database and storage in one" },
      { layer: "Hosting", recommendation: "Vercel", reason: "Zero-config deploys and previews" },
    ],
    roadmap: [
      { phase: 1, title: "Foundation", weeks: 2, items: ["Brand + copy finalized", "Core pages built", "Analytics wired"] },
      { phase: 2, title: "Launch", weeks: 2, items: ["Primary conversion flow live", "SEO basics", "Soft launch to first users"] },
      { phase: 3, title: "Grow", weeks: 4, items: ["Content hub", "Iterate from analytics", "Scale winning channels"] },
    ],
    marketingPlan: {
      launchPhases: [
        { phase: "Pre-launch", actions: ["Build waitlist landing page", "3 teaser posts", "Outreach to 20 ideal customers"] },
        { phase: "Launch week", actions: ["Announcement across channels", "Founder story post", "Limited launch offer"] },
        { phase: "Post-launch", actions: ["Weekly content cadence", "Collect testimonials", "Double down on best channel"] },
      ],
      channels: ["SEO", "Social (short-form)", "Email", input.group === "ecommerce" ? "Paid ads" : "Communities"],
      emailSequence: ["Welcome + promise", "Story + social proof", "Objection handling", "Offer + urgency", "Last call"],
    },
    disclaimer: BUILD_DISCLAIMER,
  };
}

// ---- Claude -----------------------------------------------------------------
export async function generateBuildPackage(input: BuildInput): Promise<{ pkg: BuildPackage; usedAI: boolean }> {
  if (!willUseRealBuildAI()) return { pkg: placeholder(input), usedAI: false };
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system:
        "You are a senior product strategist, UX architect, copywriter and CTO in one. Return ONLY valid minified JSON matching: " +
        "{projectNameIdeas:string[3-5],brandPositioning,targetAudience,structureOverview," +
        "pages:{pageName,purpose,sections:string[],copy:{headline,subhead,body?,cta}}[](5-9 pages appropriate to the project type)," +
        "features:{name,description,priority('must'|'should'|'later'),phase(1-3)}[](8-14)," +
        "userFlow:string[](5-8 steps),sitemap:{path,label,children?:{path,label}[]}[]," +
        "ctaStrategy,seoKeywords:string[](8-12),blogTopics:string[](6-10),uiComponentPlan:string[]," +
        "databaseSuggestion:{table,purpose,keyFields:string[]}[],techStack:{layer,recommendation,reason}[]," +
        "roadmap:{phase,title,weeks,items:string[]}[](3-4 phases)," +
        "marketingPlan:{launchPhases:{phase,actions:string[]}[],channels:string[],emailSequence:string[]}," +
        "disclaimer}. Write specific, professional, launch-ready content tailored to the brief — no lorem ipsum, " +
        "no invented metrics. Copy must sound human and on-goal. No commentary.",
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("")
      .trim().replace(/^```json?/i, "").replace(/```$/, "");
    const pkg = JSON.parse(text) as BuildPackage;
    if (!Array.isArray(pkg.pages) || pkg.pages.length === 0) pkg.pages = placeholder(input).pages;
    if (!Array.isArray(pkg.roadmap) || pkg.roadmap.length === 0) pkg.roadmap = placeholder(input).roadmap;
    pkg.disclaimer = BUILD_DISCLAIMER;
    return { pkg, usedAI: true };
  } catch {
    return { pkg: placeholder(input), usedAI: false };
  }
}

