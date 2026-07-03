"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { STATUS_COLOR, type HealthColor } from "@/lib/operations/status";

/** Map an operations status string to the shared Badge variants. */
const COLOR_VARIANT: Record<HealthColor, "success" | "warning" | "danger" | "default"> = {
  green: "success", yellow: "warning", red: "danger", gray: "default",
};

export function OpsBadge({ status }: { status: string | null | undefined }) {
  const color = STATUS_COLOR[status ?? "unknown"] ?? "gray";
  return <Badge variant={COLOR_VARIANT[color]}>{(status ?? "unknown").replace(/_/g, " ")}</Badge>;
}

/** Percentage bar with threshold coloring (70/85 warn, 95 critical). */
export function OpsProgress({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return <span className="text-xs text-muted-foreground">—</span>;
  const clamped = Math.max(0, Math.min(100, pct));
  const color = clamped >= 85 ? "bg-red-500" : clamped >= 70 ? "bg-amber-500" : "bg-brand-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{clamped}%</span>
    </div>
  );
}

/** Fetch an admin operations endpoint with loading/error/reload state. */
export function useOps<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(path, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.message ?? json.error ?? "Request failed");
      setData(json as T);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}

export function OpsLoading({ label = "Loading…" }: { label?: string }) {
  return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner size="sm" /> {label}</div>;
}

export const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString() : "—");
export const fmtDateTime = (d: string | null | undefined) => (d ? new Date(d).toLocaleString() : "—");
export const fmtMoney = (n: number | null | undefined) => (n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
export const fmtNum = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString());
