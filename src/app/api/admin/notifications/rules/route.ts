import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";

/**
 * Admin notification rules (Phase 6 — Module 6).
 * GET -> all notification_rules rows.
 * PUT { id, config?, enabled? } -> update a known rule's config/enabled.
 *   credit_thresholds config      -> { percentages: number[] }
 *   subscription_reminders config -> { days: number[] }
 */
const RULE_IDS = ["credit_thresholds", "subscription_reminders"] as const;
type RuleId = (typeof RULE_IDS)[number];

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((n) => typeof n === "number" && Number.isFinite(n));
}

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const { data, error } = await admin.from("notification_rules").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function PUT(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const rl = await limitRequestAsync(request, "admin-notif-rules", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    config?: Record<string, unknown>;
    enabled?: boolean;
  };

  const id = body.id;
  if (!id || !RULE_IDS.includes(id as RuleId)) {
    return NextResponse.json({ error: "Invalid rule id" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.config !== undefined) {
    const cfg = body.config;
    if (!cfg || typeof cfg !== "object") {
      return NextResponse.json({ error: "Invalid config" }, { status: 400 });
    }
    if (id === "credit_thresholds") {
      if (!isNumberArray((cfg as { percentages?: unknown }).percentages)) {
        return NextResponse.json(
          { error: "config.percentages must be an array of numbers" },
          { status: 400 }
        );
      }
    } else if (id === "subscription_reminders") {
      if (!isNumberArray((cfg as { days?: unknown }).days)) {
        return NextResponse.json(
          { error: "config.days must be an array of numbers" },
          { status: 400 }
        );
      }
    }
    patch.config = cfg;
  }

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }
    patch.enabled = body.enabled;
  }

  const { data, error } = await admin
    .from("notification_rules")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
