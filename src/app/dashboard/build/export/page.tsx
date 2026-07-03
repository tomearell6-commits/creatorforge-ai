import { BuildProjectsList } from "@/components/build/BuildPanels";

export const metadata = { title: "Exports — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Open a project to export its brief (Export tab).</p>
      </div>
      <BuildProjectsList />
    </div>
  );
}
