"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NOTIFICATION_META } from "@/lib/constants";
import type { Notification } from "@/lib/types";

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
          const meta = NOTIFICATION_META[n.type] ?? { emoji: "🔔", label: n.type };
          return (
            <Card key={n.id} className={`flex items-start gap-3 p-3 ${n.read ? "opacity-70" : ""}`}>
              <span className="text-xl">{meta.emoji}</span>
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
