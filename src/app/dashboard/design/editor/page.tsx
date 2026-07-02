import { Suspense } from "react";
import { DesignEditorLoader } from "./DesignEditorLoader";

export const metadata = { title: "Design Editor — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Design Editor</h1>
      <Suspense fallback={<div className="py-10 text-sm text-muted-foreground">Loading editor…</div>}>
        <DesignEditorLoader />
      </Suspense>
    </div>
  );
}
