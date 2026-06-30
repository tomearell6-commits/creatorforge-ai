"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { BookPicker } from "./BookPicker";
import { BOOK_CREDIT_COSTS } from "@/lib/constants";

const STYLES = ["Minimalist", "Photographic", "Illustrated", "Bold typographic backdrop", "Watercolor", "Abstract gradient", "Vintage", "Children's storybook"];
type Cover = { id: string; image_url: string; prompt: string | null; style: string | null };

export function BookCover() {
  const [bookId, setBookId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [covers, setCovers] = useState<Cover[]>([]);

  function load(id: string) { if (id) fetch(`/api/books/cover?bookId=${id}`).then((r) => r.json()).then((d) => setCovers(d.covers ?? [])); }
  useEffect(() => { load(bookId); }, [bookId]);

  async function generate() {
    if (!bookId || !prompt.trim()) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/books/cover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookId, prompt, style }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMsg(d.error || "Cover generation failed."); return; }
    setMsg(d.creditCost ? `Cover created — ${d.creditCost} credits used. Set as your book cover.` : "Cover created and set.");
    load(bookId);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardTitle className="text-sm">Cover Studio</CardTitle>
        <BookPicker value={bookId} onChange={(id) => setBookId(id)} />
        <div><Label htmlFor="bc-cover-style">Cover style</Label><select id="bc-cover-style" value={style} onChange={(e) => setStyle(e.target.value)} className="h-10 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-sm">{STYLES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><Label htmlFor="bc-describe-the-cover">Describe the cover</Label><Textarea id="bc-describe-the-cover" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A lone lighthouse at dusk, warm gradient sky, calm and hopeful mood." /></div>
        <Button variant="accent" disabled={!bookId || !prompt.trim() || busy} onClick={generate}>{busy ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />} Generate cover (~{BOOK_CREDIT_COSTS.cover} cr)</Button>
        {msg && <p className="text-xs text-brand-700">{msg}</p>}
        <p className="text-xs text-muted-foreground">Covers are generated as original artwork (no text or logos baked in). The newest cover is set on your book automatically.</p>
      </Card>

      {covers.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {covers.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-lg border border-border">
              <Image src={c.image_url} alt={c.prompt ?? "cover"} width={300} height={450} className="h-auto w-full object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
