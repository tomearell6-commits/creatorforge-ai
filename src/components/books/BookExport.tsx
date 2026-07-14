"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileDown, Printer } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookPicker } from "./BookPicker";
import { ContentCompletionPanel } from "@/components/publishing/ContentCompletionPanel";
import { GuidedStepper } from "@/components/studio/GuidedStepper";
import { BOOK_JOURNEY } from "@/config/bookJourney";

const NATIVE = [
  { fmt: "md", label: "Markdown (.md)" },
  { fmt: "txt", label: "Plain text (.txt)" },
  { fmt: "html", label: "Web page (.html)" },
  { fmt: "doc", label: "Word (.doc)" },
];

export function BookExport() {
  const initialBook = useSearchParams().get("book") ?? "";
  const [bookId, setBookId] = useState(initialBook);

  function download(fmt: string) { if (bookId) window.open(`/api/books/export?bookId=${bookId}&format=${fmt}`, "_blank"); }

  return (
    <div className="space-y-4">
      <GuidedStepper steps={BOOK_JOURNEY} activeId="publish" doneIds={["concept", "chapters", "cover"]} />
      <div className="rounded-xl border border-brand-500/25 bg-brand-50/50 p-3 text-sm dark:bg-brand-900/10">
        <span className="font-semibold">Step 4 of 4: Export &amp; Publish</span>
        <span className="text-muted-foreground"> — download your book, or publish/schedule it below.</span>
      </div>
      <Card className="space-y-4">
      <CardTitle className="text-sm">Choose a book to export</CardTitle>
      <BookPicker value={bookId} onChange={(id) => setBookId(id)} />
      <div className="flex flex-wrap gap-2">
        {NATIVE.map((n) => <Button key={n.fmt} variant="outline" disabled={!bookId} onClick={() => download(n.fmt)}><FileDown className="h-4 w-4" /> {n.label}</Button>)}
        <Button variant="ghost" disabled={!bookId} onClick={() => download("html")} title="Open the HTML export, then use your browser's Print → Save as PDF"><Printer className="h-4 w-4" /> PDF (print HTML)</Button>
      </div>
      <p className="text-xs text-muted-foreground">TXT, Markdown, HTML, and Word exports are free. For PDF, open the HTML export and use your browser&apos;s Print → Save as PDF. EPUB / native DOCX packaging is on the roadmap.</p>

      {bookId && (
        <ContentCompletionPanel
          contentType="book"
          sourceKind="book"
          sourceId={bookId}
          downloadUrl={`/api/books/export?bookId=${bookId}&format=pdf`}
        />
      )}
      </Card>
    </div>
  );
}
