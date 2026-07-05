/**
 * Business Health Score — deterministic 0-100 over REAL account data.
 * Pure scoring functions (unit-tested) + a server collector that gathers the
 * inputs. No AI, no invented numbers: every factor is explainable.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreProfile, type ProfileLike } from "@/lib/business/profile";

export type HealthInputs = {
  profileScore: number;          // 0-100 from scoreProfile
  productsPublished: number;
  knowledgeItems: number;
  contentActions30d: number;     // credit_usage rows in 30d (content activity)
  inquiriesOpen: number;
  inquiriesOverdue: number;      // open > 48h
  avgReplyDrafts: number;        // drafts prepared for open inquiries
  twoFactorEnabled: boolean;
  creditsRemaining: number;
  monthlyAllowance: number;
  planActive: boolean;
  automationConfigured: boolean; // any active rule or non-manual mode
};

export type HealthFactor = { id: string; label: string; score: number; max: number; advice?: string };

export type HealthReport = {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D";
  factors: HealthFactor[];
  recommendations: string[];
};

export function computeHealth(i: HealthInputs): HealthReport {
  const factors: HealthFactor[] = [];
  const recs: string[] = [];

  // Profile quality — 25 (input clamped: scorers upstream can't push a factor past its max)
  const profilePts = Math.round((Math.min(Math.max(i.profileScore, 0), 100) / 100) * 25);
  factors.push({ id: "profile", label: "Profile quality", score: profilePts, max: 25 });
  if (i.profileScore < 70) recs.push("Complete your company profile — it powers every AI reply, document and campaign.");

  // Catalogue — 10
  const catalogPts = Math.min(10, i.productsPublished * 2);
  factors.push({ id: "catalogue", label: "Product catalogue", score: catalogPts, max: 10 });
  if (i.productsPublished === 0) recs.push("Publish your first product so marketing and quotations have something to sell.");

  // Content & marketing activity — 20
  const activityPts = Math.min(20, Math.round(i.contentActions30d / 2));
  factors.push({ id: "activity", label: "Content & marketing activity (30d)", score: activityPts, max: 20 });
  if (activityPts < 8) recs.push("Publish content consistently — aim for a few AI generations or posts each week.");

  // Responsiveness — 15
  let respPts = 15;
  if (i.inquiriesOverdue > 0) respPts = Math.max(0, 15 - i.inquiriesOverdue * 3);
  factors.push({
    id: "responsiveness", label: "Inquiry responsiveness", score: respPts, max: 15,
    advice: i.inquiriesOverdue > 0 ? `${i.inquiriesOverdue} inquiries open longer than 48h` : undefined,
  });
  if (i.inquiriesOverdue > 0) recs.push(`Reply to ${i.inquiriesOverdue} overdue ${i.inquiriesOverdue === 1 ? "inquiry" : "inquiries"} — draft replies are one click away.`);

  // Automation — 10
  const autoPts = i.automationConfigured ? 10 : 3;
  factors.push({ id: "automation", label: "Automation status", score: autoPts, max: 10 });
  if (!i.automationConfigured) recs.push("Turn on Assisted mode or an auto-draft rule so routine work prepares itself.");

  // Knowledge base — 5
  const kbPts = Math.min(5, i.knowledgeItems);
  factors.push({ id: "knowledge", label: "AI knowledge base", score: kbPts, max: 5 });
  if (i.knowledgeItems === 0) recs.push("Add FAQs or policies to the Knowledge Base — replies and documents get sharper.");

  // Security — 10
  const secPts = i.twoFactorEnabled ? 10 : 2;
  factors.push({ id: "security", label: "Account security", score: secPts, max: 10 });
  if (!i.twoFactorEnabled) recs.push("Enable two-factor authentication in Settings → Security.");

  // Credits & subscription — 5
  const allowance = Math.max(i.monthlyAllowance, 1);
  const creditPts = !i.planActive ? 0 : i.creditsRemaining <= 0 ? 0 : i.creditsRemaining / allowance < 0.15 ? 2 : 5;
  factors.push({ id: "credits", label: "Credits & subscription", score: creditPts, max: 5 });
  if (creditPts < 5) recs.push("Top up credits or renew your plan so automation never stalls.");

  const score = Math.min(100, factors.reduce((s, f) => s + f.score, 0));
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
  return { score, grade, factors, recommendations: recs };
}

/** Gather live inputs for a user (service role) and compute the report. */
export async function buildHealthReport(userId: string): Promise<HealthReport> {
  const admin = createAdminClient();
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const overdueCutoff = new Date(Date.now() - 48 * 3600e3).toISOString();

  const [profileQ, productsQ, knowledgeQ, activityQ, openQ, overdueQ, draftsQ, tfaQ, walletQ, rulesQ, settingsQ] =
    await Promise.all([
      admin.from("company_profiles").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("business_products").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "published"),
      admin.from("business_knowledge").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
      admin.from("credit_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since30),
      admin.from("business_inquiries").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["new", "in_progress"]),
      admin.from("business_inquiries").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["new", "in_progress"]).lt("created_at", overdueCutoff),
      admin.from("inquiry_replies").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "draft"),
      admin.from("user_2fa_settings").select("enabled").eq("user_id", userId).maybeSingle(),
      admin.from("profiles").select("credits, plan").eq("user_id", userId).maybeSingle(),
      admin.from("business_ops_rules").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
      admin.from("business_ops_settings").select("automation_mode").eq("user_id", userId).maybeSingle(),
    ]);

  const { planCredits } = await import("@/lib/constants");
  const plan = walletQ.data?.plan ?? "free";

  return computeHealth({
    profileScore: profileQ.data ? scoreProfile(profileQ.data as ProfileLike).score : 0,
    productsPublished: productsQ.count ?? 0,
    knowledgeItems: knowledgeQ.count ?? 0,
    contentActions30d: activityQ.count ?? 0,
    inquiriesOpen: openQ.count ?? 0,
    inquiriesOverdue: overdueQ.count ?? 0,
    avgReplyDrafts: draftsQ.count ?? 0,
    twoFactorEnabled: !!tfaQ.data?.enabled,
    creditsRemaining: walletQ.data?.credits ?? 0,
    monthlyAllowance: planCredits(plan) || 50,
    planActive: true,
    automationConfigured: (rulesQ.count ?? 0) > 0 || (settingsQ.data?.automation_mode ?? "manual") !== "manual",
  });
}
