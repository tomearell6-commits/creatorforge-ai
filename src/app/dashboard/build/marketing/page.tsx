import { BuildProjectsList } from "@/components/build/BuildPanels";

export const metadata = { title: "Marketing Plans — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">Open a project to view its marketing launch plan (Marketing tab).</p>
      </div>
      <BuildProjectsList />
    </div>
  );
}
