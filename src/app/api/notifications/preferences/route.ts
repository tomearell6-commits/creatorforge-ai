import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";

/**
 * Notification preferences (Phase 6 — Module 6).
 * GET -> the user's preference row, or safe defaults if none exists.
 * PUT -> upsert a partial set of boolean prefs. Payment/security alerts
 *        (email_payment) can never be disabled and are forced true.
 */
const PREF_FIELDS = [
  "email_credit",
  "email_subscription",
  "email_payment",
  "inapp_credit",
  "inapp_subscription",
  "weekly_summary",
] as const;

type PrefField = (typeof PREF_FIELDS)[number];

const DEFAULTS: Record<PrefField, boolean> = {
  email_credit: true,
  email_subscription: true,
  email_payment: true,
  inapp_credit: true,
  inapp_subscription: true,
  weekly_summary: false,
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? { user_id: user.id, ...DEFAULTS });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "notif-prefs", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const patch: Record<string, boolean | string> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  for (const f of PREF_FIELDS) {
    if (typeof body[f] === "boolean") patch[f] = body[f] as boolean;
  }
  // Payment/security alerts cannot be disabled — always on, override the client.
  patch.email_payment = true;

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(patch, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
