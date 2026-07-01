"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  type?: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  status?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  created_at: string;
};

/** Short relative time: "now", "5m", "3h", "2d", else a short date. */
function shortTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Bell icon + unread badge with a dropdown of the latest notifications. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json().catch(() => ({}));
      const list: Notif[] = json.notifications ?? [];
      setItems(list);
      const count =
        typeof json.unreadCount === "number"
          ? json.unreadCount
          : typeof json.unread === "number"
            ? json.unread
            : list.filter((n) => n.read === false).length;
      setUnread(count);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount.
  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch when the panel is opened.
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(body: { id?: string } | { all: true }) {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  async function onItemClick(n: Notif) {
    const dest = n.cta_url || n.link || null;
    // Optimistic: mark read locally.
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
      await markRead({ id: n.id });
    }
    if (dest) {
      setOpen(false);
      router.push(dest);
    }
  }

  async function onMarkAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    await markRead({ all: true });
  }

  const latest = items.slice(0, 8);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <span className="text-xs text-muted-foreground">{unread} unread</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && latest.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
            )}
            {!loading && latest.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
            )}
            {latest.map((n) => {
              const clickable = Boolean(n.cta_url || n.link);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={cn(
                    "flex w-full items-start gap-2.5 border-b border-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/60",
                    !n.read && "bg-brand-50/60 dark:bg-brand-950/20"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.read ? "bg-transparent" : "bg-brand-600"
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", n.read ? "font-medium text-foreground" : "font-semibold")}>
                        {n.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{shortTime(n.created_at)}</span>
                    </div>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    )}
                    {clickable && n.cta_label && (
                      <span className="mt-1 inline-block text-xs font-medium text-brand-700 dark:text-brand-400">
                        {n.cta_label}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <button
              type="button"
              onClick={onMarkAll}
              disabled={unread === 0}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              Mark all read
            </button>
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
