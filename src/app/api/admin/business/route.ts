import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/** Admin monitor for the AI Business Operations Manager — aggregate counts only. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const [profiles, products, inquiries, replies, documents, reports, activity, failedish] = await Promise.all([
    admin.from("company_profiles").select("id", { count: "exact", head: true }),
    admin.from("business_products").select("id", { count: "exact", head: true }),
    admin.from("business_inquiries").select("id", { count: "exact", head: true }),
    admin.from("inquiry_replies").select("id", { count: "exact", head: true }),
    admin.from("business_documents").select("id", { count: "exact", head: true }),
    admin.from("business_reports").select("id", { count: "exact", head: true }),
    admin.from("business_ops_activity").select("id", { count: "exact", head: true }).gte("created_at", since7),
    admin.from("business_ops_activity").select("action, detail, created_at").order("created_at", { ascending: false }).limit(20),
  ]);

  return NextResponse.json({
    stats: {
      companyProfiles: profiles.count ?? 0,
      products: products.count ?? 0,
      inquiries: inquiries.count ?? 0,
      draftReplies: replies.count ?? 0,
      documents: documents.count ?? 0,
      reports: reports.count ?? 0,
      activity7d: activity.count ?? 0,
    },
    recentActivity: failedish.data ?? [],
  });
}
