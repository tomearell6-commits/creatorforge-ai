import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { DashboardPromptBar } from "@/components/dashboard/DashboardPromptBar";
import { ForgeAssistant } from "@/components/dashboard/ForgeAssistant";
import { GuidedTourProvider } from "@/components/tours/GuidedTourProvider";
import { isPlatformAdmin } from "@/lib/admin";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Admins get an extra "Admin" nav group (Admin Portal + Operations Review).
  const { ok: isAdmin } = await isPlatformAdmin();
  return (
    <GuidedTourProvider>
      <div className="flex min-h-screen">
        <Sidebar isAdmin={isAdmin} />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <DashboardPromptBar />
          <main className="flex-1 p-6">{children}</main>
        </div>
        <ForgeAssistant />
      </div>
    </GuidedTourProvider>
  );
}
