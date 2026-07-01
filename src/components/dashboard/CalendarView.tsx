"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PlatformIcon } from "@/components/icons/PlatformIcon";

type Post = {
  id: string;
  platform: string;
  scheduled_at: string;
  status: string;
  publish_jobs?: { title: string | null; project_id: string | null } | null;
};

type ViewMode = "month" | "week" | "day";

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; }

export function CalendarView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(new Date());

  async function load() {
    const res = await fetch("/api/scheduled");
    const json = await res.json();
    setPosts(json.posts ?? []);
  }
  useEffect(() => { load(); }, []);

  const byDay = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of posts) {
      const k = ymd(new Date(p.scheduled_at));
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [posts]);

  async function reschedule(id: string, dayStr: string) {
    const post = posts.find((p) => p.id === id);
    const time = post ? new Date(post.scheduled_at).toISOString().slice(11, 16) : "12:00";
    const newIso = new Date(`${dayStr}T${time}:00`).toISOString();
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, scheduled_at: newIso } : p)));
    await fetch("/api/scheduled", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, scheduledAt: newIso }),
    });
    await load();
  }

  function PostChip({ p }: { p: Post }) {
    return (
      <div draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
        className="flex cursor-grab items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
        title={`${p.publish_jobs?.title ?? "Post"} • ${new Date(p.scheduled_at).toLocaleString()} • ${p.status}`}>
        <PlatformIcon platform={p.platform} className="h-3 w-3 shrink-0" />
        <span className="truncate">{p.publish_jobs?.title ?? p.platform}</span>
      </div>
    );
  }

  function DayCell({ date, dim }: { date: Date; dim?: boolean }) {
    const key = ymd(date);
    const items = byDay.get(key) ?? [];
    const isToday = key === ymd(new Date());
    return (
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => reschedule(e.dataTransfer.getData("text/plain"), key)}
        className={`min-h-24 rounded-lg border border-border p-1.5 ${dim ? "bg-muted/30" : "bg-card"}`}>
        <div className={`mb-1 text-right text-xs ${isToday ? "font-bold text-brand-600" : "text-muted-foreground"}`}>{date.getDate()}</div>
        <div className="space-y-1">{items.map((p) => <PostChip key={p.id} p={p} />)}</div>
      </div>
    );
  }

  // Month grid
  const monthCells: { date: Date; dim: boolean }[] = [];
  {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
      monthCells.push({ date: d, dim: d.getMonth() !== cursor.getMonth() });
    }
  }
  const weekCells: Date[] = [];
  {
    const ws = startOfWeek(cursor);
    for (let i = 0; i < 7; i++) { const d = new Date(ws); d.setDate(ws.getDate() + i); weekCells.push(d); }
  }

  function move(dir: number) {
    const c = new Date(cursor);
    if (view === "month") c.setMonth(c.getMonth() + dir);
    else if (view === "week") c.setDate(c.getDate() + 7 * dir);
    else c.setDate(c.getDate() + dir);
    setCursor(c);
  }

  const label = view === "month"
    ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : view === "week"
      ? `Week of ${startOfWeek(cursor).toLocaleDateString()}`
      : cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

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
          {(["month", "week", "day"] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize ${view === v ? "bg-brand-600 text-white" : "border border-border"}`}>{v}</button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthCells.map((c, i) => <DayCell key={i} date={c.date} dim={c.dim} />)}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="grid grid-cols-7 gap-1">
          {weekCells.map((d, i) => (
            <div key={i}>
              <div className="mb-1 text-center text-xs text-muted-foreground">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
              <DayCell date={d} />
            </div>
          ))}
        </div>
      )}

      {view === "day" && <DayCell date={cursor} />}

      <p className="text-xs text-muted-foreground">Drag a post to another day to reschedule it.</p>
    </div>
  );
}
