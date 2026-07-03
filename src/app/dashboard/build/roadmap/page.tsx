import { BuildProjectsList } from "@/components/build/BuildPanels";

export const metadata = { title: "Roadmaps — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roadmaps</h1>
        <p className="mt-1 text-sm text-muted-foreground">Open a project to view its development roadmap (Roadmap tab).</p>
      </div>
      <BuildProjectsList />
    </div>
  );
}
