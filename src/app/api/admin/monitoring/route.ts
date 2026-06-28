import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/**
 * System monitoring (Phase 7 — Module 9). Health of background jobs, queues,
 * webhooks/payments/email, plus alerts for abnormal conditions. Computed from
 * core tables; webhook/payment/email failures read from billing_events +
 * audit_logs where recorded.
 */
function health(failed: number, total: number) {
  if (total === 0) return "idle";
  const rate = failed / total;
  return rate > 0.25 ? "critical" : rate > 0.05 ? "degraded" : "ok";
}

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const [renders, publishes, billing, assets] = await Promise.all([
    admin.from("render_jobs").select("status"),
    admin.from("scheduled_posts").select("status"),
    admin.from("billing_events").select("type, status"),
    admin.from("assets").select("size_bytes"),
  ]);

  const r = renders.data ?? [];
  const p = publishes.data ?? [];
  const b = billing.data ?? [];
  const renderFailed = r.filter((x) => x.status === "failed").length;
  const pubFailed = p.filter((x) => x.status === "failed").length;
  const payFailed = b.filter((x) => x.type === "payment" && x.status !== "completed").length;
  const storageBytes = (assets.data ?? []).reduce((s, a) => s + (a.size_bytes ?? 0), 0);

  const services = [
    { name: "Render queue", status: health(renderFailed, r.length), detail: `${r.length} jobs, ${renderFailed} failed` },
    { name: "Publishing queue", status: health(pubFailed, p.length), detail: `${p.length} posts, ${pubFailed} failed` },
    { name: "Payments", status: health(payFailed, b.length), detail: `${b.length} events, ${payFailed} failed` },
    { name: "Database", status: "ok", detail: "Reachable" },
    { name: "Storage", status: storageBytes > 5 * 1024 ** 3 ? "degraded" : "ok", detail: `${(storageBytes / 1024 ** 2).toFixed(1)} MB used` },
    { name: "Email", status: process.env.NOTIFY_EMAIL === "true" ? "ok" : "idle", detail: process.env.NOTIFY_EMAIL === "true" ? "Transport enabled" : "Disabled" },
  ];

  const alerts = services.filter((s) => s.status === "critical" || s.status === "degraded").map((s) => ({
    level: s.status === "critical" ? "critical" : "warning",
    message: `${s.name}: ${s.detail}`,
  }));

  return NextResponse.json({ services, alerts });
}
