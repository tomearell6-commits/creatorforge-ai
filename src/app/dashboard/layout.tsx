import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { DashboardPromptBar } from "@/components/dashboard/DashboardPromptBar";
import { ForgeAssistant } from "@/components/dashboard/ForgeAssistant";
import { GuidedTourProvider } from "@/components/tours/GuidedTourProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuidedTourProvider>
      <div className="flex min-h-screen">
        <Sidebar />
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
