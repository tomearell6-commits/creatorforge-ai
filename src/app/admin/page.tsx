import { Suspense } from "react";
import { AdminDashboard, AdminDashboardSkeleton } from "@/components/admin/AdminDashboard";
import { isPlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOverview } from "@/lib/admin-overview";

/** Loads the numbers on the server and streams them in; placeholders show meanwhile. */
async function OverviewLoader() {
  // Defence in depth: the layout already gates this area. This call is cached for the
  // request, so it re-uses the layout's result and costs nothing extra.
  const { ok } = await isPlatformAdmin();
  if (!ok) return null;
  return <AdminDashboard d={await getAdminOverview(createAdminClient())} />;
}

export default function AdminHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Dashboard</h1>
      <Suspense fallback={<AdminDashboardSkeleton />}>
        <OverviewLoader />
      </Suspense>
    </div>
  );
}
