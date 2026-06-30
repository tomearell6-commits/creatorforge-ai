import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { BOOK_CREDIT_COSTS } from "@/lib/constants";

const ROWS: [string, number, string][] = [
  ["Book concept", BOOK_CREDIT_COSTS.concept, "Title, hook, description, objectives, and USPs."],
  ["Chapter outline", BOOK_CREDIT_COSTS.outline, "Full chapter-by-chapter outline with summaries."],
  ["Draft a chapter", BOOK_CREDIT_COSTS.chapter, "AI writes a full first draft of a chapter."],
  ["Chapter AI tool", BOOK_CREDIT_COSTS.chapterTool, "Expand, rewrite, improve, continue, grammar, etc."],
  ["Book cover", BOOK_CREDIT_COSTS.cover, "Original cover artwork."],
  ["Illustration", BOOK_CREDIT_COSTS.illustration, "In-chapter illustration (roadmap)."],
  ["Marketing asset", BOOK_CREDIT_COSTS.marketing, "Description, blurb, social posts, email, etc."],
  ["Export", BOOK_CREDIT_COSTS.export, "TXT, MD, HTML, and DOC exports are free."],
];

export function BookSettings() {
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardTitle className="text-base">Credit model</CardTitle>
        <p className="text-sm text-muted-foreground">You&apos;re only charged when real AI generation runs. Writing manually, editing, organizing, and text-based exports are free.</p>
        <div className="divide-y divide-border rounded-lg border border-border">
          {ROWS.map(([name, cost, desc]) => (
            <div key={name} className="flex items-center justify-between gap-4 px-3 py-2">
              <div><p className="text-sm font-medium">{name}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
              <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-semibold text-brand-800 dark:bg-brand-950/40">{cost === 1 && name === "Export" ? "Free" : `${cost} cr`}</span>
            </div>
          ))}
        </div>
        <Link href="/dashboard/credits" className="text-sm text-brand-700 hover:underline">Manage your credit wallet →</Link>
      </Card>

      <Card className="space-y-2">
        <CardTitle className="text-base">Privacy</CardTitle>
        <p className="text-sm text-muted-foreground">Your manuscripts are private. Every book, chapter, version, cover, and export is protected by row-level security and only accessible to your account. Export downloads require you to be signed in.</p>
      </Card>
    </div>
  );
}
