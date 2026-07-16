"use client";

import { useEffect, useState } from "react";
import { Clapperboard, CheckCircle2, AlertTriangle, Coins, RefreshCw, HardDrive, Bell, XCircle, CalendarClock, CreditCard, CalendarX, Ban, FileBarChart, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Notification } from "@/lib/types";

const RED = "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
const AMBER = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
const BRAND = "bg-brand-100 text-brand-900 dark:bg-brand-950/50 dark:text-brand-300";
const BLUE = "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

// One semantic Lucide icon (+ tint) per notification type — replaces emoji.
const NOTIF_ICON: Record<string, { Icon: LucideIcon; tint: string }> = {
  render_complete:      { Icon: Clapperboard, tint: BRAND },
  publish_success:      { Icon: CheckCircle2,  tint: BRAND },
  publish_failed:       { Icon: AlertTriangle, tint: RED },
  credits_low:          { Icon: Coins,         tint: AMBER },
  credits_critical:     { Icon: AlertTriangle, tint: AMBER },
  credits_exhausted:    { Icon: XCircle,       tint: RED },
  topup_success:        { Icon: Coins,         tint: BRAND },
  subscription_renewed: { Icon: RefreshCw,     tint: BLUE },
  subscription_reminder:{ Icon: CalendarClock, tint: BLUE },
  subscription_expired: { Icon: CalendarX,     tint: RED },
  subscription_cancelled:{ Icon: Ban,          tint: RED },
  payment_failed:       { Icon: CreditCard,    tint: RED },
  weekly_summary:       { Icon: FileBarChart,  tint: BLUE },
  storage_full:         { Icon: HardDrive,     tint: AMBER },
};
const NOTIF_FALLBACK = { Icon: Bell, tint: "bg-muted text-muted-foreground" };

export function NotificationsList() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/notifications");
    const json = await res.json();
    setItems(json.notifications ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }
  async function dismiss(id: string) {
    await fetch("/api/notifications", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={markAll}>Mark all read</Button>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
      <div className="space-y-2">
        {items.map((n) => {
          const { Icon, tint } = NOTIF_ICON[n.type] ?? NOTIF_FALLBACK;
          return (
            <Card key={n.id} className={`flex items-start gap-3 p-3 ${n.read ? "opacity-70" : ""}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tint}`}><Icon className="h-4 w-4" aria-hidden /></span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                </div>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => dismiss(n.id)}>Dismiss</button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
