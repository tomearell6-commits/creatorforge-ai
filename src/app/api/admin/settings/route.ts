import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

/**
 * System settings + feature flags (Phase 7 — Module 1/3).
 * GET   -> all system_settings + feature_flags.
 * PATCH { settings?: {key,value}[], flags?: {key,enabled}[] } -> upsert.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const [settings, flags] = await Promise.all([
    admin.from("system_settings").select("*").order("key"),
    admin.from("feature_flags").select("*").order("key"),
  ]);
  return NextResponse.json({ settings: settings.data ?? [], flags: flags.data ?? [] });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const { settings, flags } = await request.json();

  if (Array.isArray(settings)) {
    for (const s of settings) {
      await admin.from("system_settings").upsert(
        { key: s.key, value: s.value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    }
  }
  if (Array.isArray(flags)) {
    for (const f of flags) {
      await admin.from("feature_flags").upsert(
        { key: f.key, enabled: !!f.enabled, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    }
  }

  await logAudit(admin, { userId: user.id, actorEmail: user.email, action: "settings.updated", targetType: "system" });
  return NextResponse.json({ ok: true });
}
