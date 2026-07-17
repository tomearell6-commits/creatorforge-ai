import { BuildStudioDashboard } from "@/components/build/BuildPanels";
import { BuildJourney } from "@/components/build/BuildJourney";

export const metadata = { title: "Build Studio — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Build Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Turn ideas into complete website, app, store and funnel plans - structure, copy, roadmap and marketing in one package.</p>
      </div>
      <BuildJourney />
      <BuildStudioDashboard />
    </div>
  );
}
