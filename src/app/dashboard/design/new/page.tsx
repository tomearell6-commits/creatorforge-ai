import { Suspense } from "react";
import { DesignProjectWizard } from "@/components/design/DesignProjectWizard";

export const metadata = { title: "New Design — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create a new design</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a category, format and style, then let AI draft your concept.</p>
      </div>
      <Suspense fallback={<div className="py-10 text-sm text-muted-foreground">Loading…</div>}>
        <DesignProjectWizard />
      </Suspense>
    </div>
  );
}
