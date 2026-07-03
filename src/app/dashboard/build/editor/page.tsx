import { Suspense } from "react";
import { BuildEditor } from "@/components/build/BuildEditor";

export const metadata = { title: "Project Editor — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Project Editor</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your full project package: structure, copy, spec, roadmap, marketing and exports.</p>
      </div>
      <Suspense fallback={<div className="py-10 text-sm text-muted-foreground">Loading…</div>}>
        <BuildEditor />
      </Suspense>
    </div>
  );
}
