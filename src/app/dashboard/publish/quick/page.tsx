import type { Metadata } from "next";
import { QuickPostComposer } from "@/components/social/QuickPostComposer";

export const metadata: Metadata = { title: "Quick Post — CreatorsForge" };

export default function QuickPostPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Quick post</h1>
        <p className="text-sm text-muted-foreground">
          Share a short update to your connected social accounts in seconds — no video or project needed.
        </p>
      </div>
      <QuickPostComposer />
    </div>
  );
}
