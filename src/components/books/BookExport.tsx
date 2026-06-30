"use client";

import { useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookPicker } from "./BookPicker";

const NATIVE = [
  { fmt: "md", label: "Markdown (.md)" },
  { fmt: "txt", label: "Plain text (.txt)" },
  { fmt: "html", label: "Web page (.html)" },
  { fmt: "doc", label: "Word (.doc)" },
];

export function BookExport() {
  const [bookId, setBookId] = useState("");

  function download(fmt: string) { if (bookId) window.open(`/api/books/export?bookId=${bookId}&format=${fmt}`, "_blank"); }

  return (
    <Card className="space-y-4">
      <CardTitle className="text-sm">Choose a book to export</CardTitle>
      <BookPicker value={bookId} onChange={(id) => setBookId(id)} />
      <div className="flex flex-wrap gap-2">
        {NATIVE.map((n) => <Button key={n.fmt} variant="outline" disabled={!bookId} onClick={() => download(n.fmt)}><FileDown className="h-4 w-4" /> {n.label}</Button>)}
        <Button variant="ghost" disabled={!bookId} onClick={() => download("html")} title="Open the HTML export, then use your browser's Print → Save as PDF"><Printer className="h-4 w-4" /> PDF (print HTML)</Button>
      </div>
      <p className="text-xs text-muted-foreground">TXT, Markdown, HTML, and Word exports are free. For PDF, open the HTML export and use your browser&apos;s Print → Save as PDF. EPUB / native DOCX packaging is on the roadmap.</p>
    </Card>
  );
}
