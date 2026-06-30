"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Plus, Save, History, Wand2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { BOOK_CREDIT_COSTS } from "@/lib/constants";

type Book = { id: string; title: string; subtitle: string | null; status: string };
type Chapter = { id: string; title: string; content: string; word_count: number; position: number; status: string; notes: string | null };
type Version = { id: string; content: string; label: string | null; created_at: string };

const TOOLS: { action: string; label: string }[] = [
  { action: "expand", label: "Expand" }, { action: "shorten", label: "Shorten" },
  { action: "rewrite", label: "Rewrite" }, { action: "continue", label: "Continue" },
  { action: "improve", label: "Improve" }, { action: "grammar", label: "Fix grammar" },
  { action: "examples", label: "Add examples" }, { action: "summarize", label: "Summarize" },
];

export function BookEditor({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [busy, setBusy] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = chapters.find((c) => c.id === activeId) || null;

  const loadChapters = useCallback(async (selectId?: string) => {
    const r = await fetch(`/api/books/chapters?bookId=${bookId}`);
    const d = await r.json();
    const list: Chapter[] = d.chapters ?? [];
    setChapters(list);
    const sel = selectId || activeId || list[0]?.id || null;
    if (sel) { setActiveId(sel); const c = list.find((x) => x.id === sel); if (c) { setContent(c.content); setTitle(c.title); } }
  }, [bookId, activeId]);

  useEffect(() => {
    fetch("/api/books").then((r) => r.json()).then((d) => setBook((d.books ?? []).find((b: Book) => b.id === bookId) ?? null));
    loadChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  function selectChapter(c: Chapter) { setActiveId(c.id); setContent(c.content); setTitle(c.title); setVersions(null); setMsg(null); }

  const save = useCallback(async (snapshot = false) => {
    if (!activeId) return;
    setSaving("saving");
    await fetch("/api/books/chapters", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeId, content, title, snapshot }) });
    setSaving("saved");
    setChapters((prev) => prev.map((c) => c.id === activeId ? { ...c, content, title, word_count: content.trim() ? content.trim().split(/\s+/).length : 0 } : c));
  }, [activeId, content, title]);

  // Debounced autosave on content/title change.
  useEffect(() => {
    if (!activeId) return;
    setSaving("idle");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(), 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, title]);

  async function runTool(action?: string) {
    if (!activeId) return;
    setBusy(action || "Drafting chapter…"); setMsg(null);
    await save(true); // snapshot current before AI replaces it
    const r = await fetch("/api/books/chapters/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chapterId: activeId, action }) });
    const d = await r.json();
    setBusy(null);
    if (!r.ok) { setMsg(d.error || "Generation failed."); return; }
    setContent(d.content);
    if (d.creditCost) setMsg(`Done — ${d.creditCost} credit(s) used.`); else setMsg("Done.");
    setChapters((prev) => prev.map((c) => c.id === activeId ? { ...c, content: d.content } : c));
  }

  async function addChapter() {
    const r = await fetch("/api/books/chapters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookId, title: `Chapter ${chapters.length + 1}`, position: chapters.length + 1 }) });
    const d = await r.json();
    if (d.id) loadChapters(d.id);
  }

  async function loadVersions() {
    if (!activeId) return;
    const r = await fetch(`/api/books/chapters/versions?chapterId=${activeId}`);
    const d = await r.json();
    setVersions(d.versions ?? []);
  }

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const totalWords = chapters.reduce((s, c) => s + (c.id === activeId ? words : c.word_count), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/books/library" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Library</Link>
        <div className="text-sm text-muted-foreground">{chapters.length} chapters · {totalWords.toLocaleString()} words</div>
      </div>
      <div>
        <h1 className="text-2xl font-bold">{book?.title ?? "Book"}</h1>
        {book?.subtitle && <p className="text-muted-foreground">{book.subtitle}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Outline sidebar */}
        <Card className="space-y-2 self-start">
          <div className="flex items-center justify-between"><CardTitle className="text-sm">Outline</CardTitle><button onClick={addChapter} title="Add chapter"><Plus className="h-4 w-4 text-brand-600" /></button></div>
          <ul className="space-y-1">
            {chapters.map((c, i) => (
              <li key={c.id}>
                <button onClick={() => selectChapter(c)} className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${c.id === activeId ? "bg-brand-50 text-brand-800 dark:bg-brand-950/40" : "hover:bg-muted"}`}>
                  <span className="line-clamp-1">{i + 1}. {c.title}</span>
                  <span className="text-xs text-muted-foreground">{c.word_count} words</span>
                </button>
              </li>
            ))}
            {chapters.length === 0 && <li className="text-sm text-muted-foreground">No chapters yet. Add one to start.</li>}
          </ul>
        </Card>

        {/* Editor */}
        {active ? (
          <Card className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-semibold" />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="accent" disabled={!!busy} onClick={() => runTool()}>{busy === "Drafting chapter…" ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />} Draft chapter (~{BOOK_CREDIT_COSTS.chapter} cr)</Button>
              {TOOLS.map((t) => <button key={t.action} disabled={!!busy} onClick={() => runTool(t.action)} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50">{busy === t.action ? <Spinner size="sm" className="text-current" /> : <Wand2 className="h-3 w-3" />}{t.label}</button>)}
            </div>
            {msg && <p className="text-xs text-brand-700">{msg}</p>}
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={22} className="w-full resize-y rounded-lg border border-border bg-background p-3 font-serif text-[15px] leading-relaxed" placeholder="Write here, or click Draft chapter to let AI write the first draft from your outline notes." />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{words.toLocaleString()} words · {saving === "saving" ? "Saving…" : saving === "saved" ? "All changes saved" : "Editing…"}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => save(true)}><Save className="h-3.5 w-3.5" /> Save version</Button>
                <Button size="sm" variant="ghost" onClick={loadVersions}><History className="h-3.5 w-3.5" /> History</Button>
              </div>
            </div>
            {versions && (
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-sm font-medium">Version history</p>
                {versions.length === 0 ? <p className="text-xs text-muted-foreground">No saved versions yet.</p> : (
                  <ul className="space-y-1 text-xs">
                    {versions.map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{v.label ?? "version"} · {new Date(v.created_at).toLocaleString()}</span>
                        <button onClick={() => { setContent(v.content); setVersions(null); }} className="text-brand-700 hover:underline">Restore</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        ) : (
          <Card className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <p>Add a chapter to begin writing.</p>
            <Button onClick={addChapter}><Plus className="h-4 w-4" /> Add chapter</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
