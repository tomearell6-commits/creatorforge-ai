import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { DashboardPromptBar } from "@/components/dashboard/DashboardPromptBar";
import { ForgeAssistant } from "@/components/dashboard/ForgeAssistant";
import { Breadcrumbs } from "@/components/dashboard/Breadcrumbs";
import { GuidedTourProvider } from "@/components/tours/GuidedTourProvider";
import { isPlatformAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Admins get an extra "Admin" nav group; the plan drives locked-item states.
  const { ok: isAdmin, user } = await isPlatformAdmin();
  let plan = "free";
  if (user) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles").select("plan").eq("user_id", user.id).maybeSingle();
    plan = profile?.plan ?? "free";
  }
  return (
    <GuidedTourProvider>
      <div className="flex min-h-screen">
        <Sidebar isAdmin={isAdmin} plan={plan} />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <DashboardPromptBar />
          {/* pb-28 keeps the floating Forge AI button from covering page action
              buttons (e.g. Send) that sit at the very bottom of a page. */}
          <main className="flex-1 p-6 pb-28">
            <Breadcrumbs />
            {children}
          </main>
        </div>
        <ForgeAssistant />
      </div>
    </GuidedTourProvider>
  );
}
