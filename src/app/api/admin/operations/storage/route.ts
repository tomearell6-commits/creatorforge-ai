import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Database & storage overview. Row counts come from live tables; capacity
 * figures (DB size, plan limits, backups) are admin-maintained via the
 * supabase-db / supabase-storage quota rows since Supabase does not expose
 * them through the client API — the page links to the Supabase dashboard.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const countAll = async (table: string) => {
    const { count } = await admin.from(table).select("*", { count: "exact", head: true });
    return count ?? 0;
  };

  const [users, projects, assets, designAssets, renderJobs, exportsCount, leads, articles] = await Promise.all([
    countAll("profiles"), countAll("projects"), countAll("assets"), countAll("design_assets"),
    countAll("render_jobs"), countAll("design_exports"), countAll("leads"), countAll("seo_articles"),
  ]);

  // Admin-maintained capacity entries (storage_gb quotas on the supabase rows).
  const { data: quotas } = await admin
    .from("operations_usage_quotas")
    .select("*")
    .in("provider_id", ["supabase-db", "supabase-storage", "cloudflare-r2"]);

  return NextResponse.json({
    ok: true,
    counts: { users, projects, assets, designAssets, renderJobs, designExports: exportsCount, leads, seoArticles: articles },
    capacity: quotas ?? [],
    dashboards: {
      database: "https://supabase.com/dashboard/project/_/settings/infrastructure",
      storage: "https://supabase.com/dashboard/project/_/storage/buckets",
      backups: "https://supabase.com/dashboard/project/_/database/backups",
    },
  });
}
