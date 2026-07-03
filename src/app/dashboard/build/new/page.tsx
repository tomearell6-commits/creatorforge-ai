import { Suspense } from "react";
import { BuildProjectWizard } from "@/components/build/BuildProjectWizard";

export const metadata = { title: "New Build Project — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Build Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">Describe your idea and generate the full project package.</p>
      </div>
      <Suspense fallback={<div className="py-10 text-sm text-muted-foreground">Loading…</div>}>
        <BuildProjectWizard />
      </Suspense>
    </div>
  );
}
