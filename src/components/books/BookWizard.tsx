"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { BOOK_CATEGORIES, BOOK_WRITING_STYLES, BOOK_TONES, BOOK_READING_LEVELS, BOOK_CREDIT_COSTS } from "@/lib/constants";
import { GuidedStepper } from "@/components/studio/GuidedStepper";
import { BOOK_JOURNEY } from "@/config/bookJourney";

export function BookWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const [f, setF] = useState({ title: "", subtitle: "", author_name: "", language: "en", audience: "", category: "Business", writing_style: "Professional", tone: "Friendly", reading_level: "General", target_words: 20000 });
  const [chapters, setChapters] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const cat = params.get("category");
    if (cat && (BOOK_CATEGORIES as readonly string[]).includes(cat)) setF((p) => ({ ...p, category: cat }));
  }, [params]);

  async function create(generateOutline: boolean) {
    if (!f.title.trim()) { setErr("Book title is required."); return; }
    setErr(null); setBusy(generateOutline ? "Creating + outlining…" : "Creating…");
    const r = await fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await r.json();
    if (!r.ok) { setErr(d.error || "Could not create book."); setBusy(null); return; }
    if (generateOutline) {
      await fetch("/api/books/outline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookId: d.id, chapters }) });
    }
    router.push(`/dashboard/books/${d.id}`);
  }

  return (
    <div className="space-y-4">
      <GuidedStepper steps={BOOK_JOURNEY} activeId="concept" />
      <div className="rounded-xl border border-brand-500/25 bg-brand-50/50 p-3 text-sm dark:bg-brand-900/10">
        <span className="font-semibold">Step 1 of 4: Concept</span>
        <span className="text-muted-foreground"> — set up your book below. Next you&rsquo;ll write chapters, design a cover, then export &amp; publish.</span>
      </div>
      <Card className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="bw-book-title">Book title</Label><Input id="bw-book-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="The Lean Founder" /></div>
        <div><Label htmlFor="bw-subtitle">Subtitle</Label><Input id="bw-subtitle" value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></div>
        <div><Label htmlFor="bw-author-name">Author name</Label><Input id="bw-author-name" value={f.author_name} onChange={(e) => setF({ ...f, author_name: e.target.value })} /></div>
        <div><Label htmlFor="bw-category">Category</Label><select id="bw-category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{BOOK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><Label htmlFor="bw-target-audience">Target audience</Label><Input id="bw-target-audience" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} placeholder="first-time founders" /></div>
        <div><Label htmlFor="bw-writing-style">Writing style</Label><select id="bw-writing-style" value={f.writing_style} onChange={(e) => setF({ ...f, writing_style: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{BOOK_WRITING_STYLES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><Label htmlFor="bw-tone">Tone</Label><select id="bw-tone" value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{BOOK_TONES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><Label htmlFor="bw-reading-level">Reading level</Label><select id="bw-reading-level" value={f.reading_level} onChange={(e) => setF({ ...f, reading_level: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{BOOK_READING_LEVELS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><Label htmlFor="bw-language">Language</Label><Input id="bw-language" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} /></div>
        <div><Label htmlFor="bw-target-word-count">Target word count</Label><Input id="bw-target-word-count" type="number" value={f.target_words} onChange={(e) => setF({ ...f, target_words: Number(e.target.value) })} /></div>
        <div><Label htmlFor="bw-chapters-to-outline">Chapters to outline</Label><Input id="bw-chapters-to-outline" type="number" value={chapters} onChange={(e) => setChapters(Number(e.target.value))} /></div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="accent" disabled={!!busy} onClick={() => create(true)}>{busy || `Create + generate outline (~${BOOK_CREDIT_COSTS.outline + BOOK_CREDIT_COSTS.concept} cr)`}</Button>
        <Button variant="outline" disabled={!!busy} onClick={() => create(false)}>Create blank book</Button>
      </div>
      <p className="text-xs text-muted-foreground">Generating the concept + outline uses credits (only when AI is enabled). Creating a blank book is free.</p>
      </Card>
    </div>
  );
}
