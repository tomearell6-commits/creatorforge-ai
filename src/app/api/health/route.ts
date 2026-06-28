import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Health check (Phase 8 — Modules 10 & 15). Used by uptime monitors, load
 * balancers, and deploy health gates. Reports app + database reachability.
 */
export async function GET() {
  const started = Date.now();
  let db: "ok" | "down" = "ok";
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").select("user_id").limit(1);
    if (error) db = "down";
  } catch {
    db = "down";
  }

  const healthy = db === "ok";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      db,
      uptimeSec: Math.round(process.uptime()),
      latencyMs: Date.now() - started,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
