"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Copy } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { BookPicker } from "./BookPicker";
import { BOOK_CREDIT_COSTS } from "@/lib/constants";
import { GuidedStepper } from "@/components/studio/GuidedStepper";
import { BOOK_JOURNEY } from "@/config/bookJourney";
import { ContentCompletionPanel } from "@/components/publishing/ContentCompletionPanel";

const TYPES: { type: string; label: string }[] = [
  { type: "description", label: "Sales description" },
  { type: "back_cover", label: "Back-cover blurb" },
  { type: "author_bio", label: "Author bio" },
  { type: "keywords", label: "Store keywords" },
  { type: "social_posts", label: "Social launch posts" },
  { type: "email_announcement", label: "Launch email" },
  { type: "press_release", label: "Press release" },
  { type: "ad_copy", label: "Ad copy" },
];

type Asset = { id: string; asset_type: string; content: string; created_at: string };

export function BookMarketing() {
  const initialBook = useSearchParams().get("book") ?? "";
  const [bookId, setBookId] = useState(initialBook);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function load(id: string) { if (id) fetch(`/api/books/marketing?bookId=${id}`).then((r) => r.json()).then((d) => setAssets(d.assets ?? [])); }
  useEffect(() => { load(bookId); }, [bookId]);

  async function gen(type: string) {
    if (!bookId) return;
    setBusy(type); setMsg(null);
    const r = await fetch("/api/books/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookId, type }) });
    const d = await r.json();
    setBusy(null);
    if (!r.ok) { setMsg(d.error || "Generation failed."); return; }
    if (d.creditCost) setMsg(`Generated — ${d.creditCost} credit(s) used.`);
    load(bookId);
  }

  return (
    <div className="space-y-4">
      <GuidedStepper steps={BOOK_JOURNEY} activeId="marketing" doneIds={["concept", "chapters", "cover", "publish"]} />
      <div className="rounded-xl border border-brand-500/25 bg-brand-50/50 p-3 text-sm dark:bg-brand-900/10">
        <span className="font-semibold">Step 5 of 5: Marketing &amp; Ads</span>
        <span className="text-muted-foreground"> — generate launch copy, connect your social &amp; ad accounts, then publish and run ads (Meta / Facebook, Google, YouTube).</span>
      </div>

      <Card className="space-y-3">
        <CardTitle className="text-sm">Choose a book</CardTitle>
        <BookPicker value={bookId} onChange={(id) => setBookId(id)} />
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => <Button key={t.type} size="sm" variant="outline" disabled={!bookId || !!busy} onClick={() => gen(t.type)}>{busy === t.type ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />}{t.label}</Button>)}
        </div>
        <p className="text-xs text-muted-foreground">Each asset costs ~{BOOK_CREDIT_COSTS.marketing} credits when AI is enabled. {msg && <span className="text-brand-700">{msg}</span>}</p>
      </Card>

      {/* Connect accounts + publish + run ads for this book. */}
      {bookId && (
        <ContentCompletionPanel
          contentType="book"
          sourceKind="book"
          sourceId={bookId}
          downloadUrl={`/api/books/export?bookId=${bookId}&format=pdf`}
        />
      )}

      <div className="space-y-3">
        {assets.map((a) => (
          <Card key={a.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm capitalize">{a.asset_type.replace(/_/g, " ")}</CardTitle>
              <button onClick={() => navigator.clipboard.writeText(a.content)} title="Copy" className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">{a.content}</pre>
          </Card>
        ))}
        {assets.length === 0 && bookId && <p className="text-sm text-muted-foreground">No marketing assets yet. Generate one above.</p>}
      </div>
    </div>
  );
}
