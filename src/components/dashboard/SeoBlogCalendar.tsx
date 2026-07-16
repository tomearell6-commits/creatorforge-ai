"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

type Article = { id: string; seo_title: string; main_keyword: string; status: string; scheduled_at: string | null; published_at: string | null };
type View = "month" | "week" | "day";

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; }

export function SeoBlogCalendar() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => { fetch("/api/seo/articles").then((r) => r.json()).then((j) => setArticles(j.articles ?? [])); }, []);

  const byDay = useMemo(() => {
    const m = new Map<string, Article[]>();
    for (const a of articles) {
      const when = a.scheduled_at || a.published_at;
      if (!when) continue;
      const k = ymd(new Date(when));
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return m;
  }, [articles]);

  function Chip({ a }: { a: Article }) {
    const color = a.status === "published" ? "bg-green-100 text-green-700" : a.status === "failed" ? "bg-red-100 text-red-700" : "bg-brand-100 text-brand-900";
    return <div className={`truncate rounded px-1.5 py-0.5 text-xs ${color}`} title={a.seo_title}>📝 {a.seo_title || a.main_keyword}</div>;
  }
  function Cell({ date, dim }: { date: Date; dim?: boolean }) {
    const key = ymd(date);
    const items = byDay.get(key) ?? [];
    const today = key === ymd(new Date());
    return (
      <div className={`min-h-24 rounded-lg border border-border p-1.5 ${dim ? "bg-muted/30" : "bg-card"}`}>
        <div className={`mb-1 text-right text-xs ${today ? "font-bold text-brand-600" : "text-muted-foreground"}`}>{date.getDate()}</div>
        <div className="space-y-1">{items.map((a) => <Chip key={a.id} a={a} />)}</div>
      </div>
    );
  }

  const monthCells: { date: Date; dim: boolean }[] = [];
  { const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const gs = startOfWeek(first);
    for (let i = 0; i < 42; i++) { const d = new Date(gs); d.setDate(gs.getDate() + i); monthCells.push({ date: d, dim: d.getMonth() !== cursor.getMonth() }); } }
  const weekCells: Date[] = [];
  { const ws = startOfWeek(cursor); for (let i = 0; i < 7; i++) { const d = new Date(ws); d.setDate(ws.getDate() + i); weekCells.push(d); } }

  function move(dir: number) { const c = new Date(cursor); if (view === "month") c.setMonth(c.getMonth() + dir); else if (view === "week") c.setDate(c.getDate() + 7 * dir); else c.setDate(c.getDate() + dir); setCursor(c); }
  const label = view === "month" ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" }) : view === "week" ? `Week of ${startOfWeek(cursor).toLocaleDateString()}` : cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => move(-1)}>‹</Button>
          <span className="min-w-44 text-center font-semibold">{label}</span>
          <Button size="sm" variant="outline" onClick={() => move(1)}>›</Button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(new Date())}>Today</Button>
        </div>
        <div className="flex gap-1">
          {(["month", "week", "day"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 text-sm capitalize ${view === v ? "bg-brand-600 text-white" : "border border-border"}`}>{v}</button>
          ))}
        </div>
      </div>
      {view === "month" && (
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">{monthCells.map((c, i) => <Cell key={i} date={c.date} dim={c.dim} />)}</div>
        </div>
      )}
      {view === "week" && <div className="grid grid-cols-7 gap-1">{weekCells.map((d, i) => (<div key={i}><div className="mb-1 text-center text-xs text-muted-foreground">{d.toLocaleDateString(undefined, { weekday: "short" })}</div><Cell date={d} /></div>))}</div>}
      {view === "day" && <Cell date={cursor} />}
      <p className="text-xs text-muted-foreground">Scheduled + published SEO articles. Reschedule from the article editor.</p>
    </div>
  );
}
