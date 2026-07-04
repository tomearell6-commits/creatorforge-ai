import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { userHas2faEnabled } from "@/lib/security/twofactor";
import { verifyActionToken } from "@/lib/security/twofactor-cookie";
import { logSecurityEvent } from "@/lib/security/events";

/**
 * Payment method PREFERENCES. We never store card or wallet data — Paddle
 * hosts card details; crypto entries are just a labelled currency preference.
 * Adding/removing is a high-risk action: accounts with 2FA must confirm with a
 * fresh code (x-2fa-token from /api/security/2fa/verify-action).
 */
async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function tfaGate(req: Request, userId: string): Promise<NextResponse | null> {
  if (!(await userHas2faEnabled(userId))) return null;
  if (await verifyActionToken(req.headers.get("x-2fa-token"), userId)) return null;
  await logSecurityEvent({ eventType: "2FA_REQUIRED_FOR_ACTION", req, userId, metadata: { action: "payment_methods", satisfied: false } });
  return NextResponse.json({ error: "Two-factor confirmation required.", code: "2FA_REQUIRED" }, { status: 403 });
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: methods } = await admin
    .from("payment_methods")
    .select("id, provider, label, is_default, created_at")
    .eq("user_id", user.id)
    .order("created_at");
  return NextResponse.json({
    methods: methods ?? [],
    paddleAvailable: !!process.env.PADDLE_API_KEY || !!process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  });
}

export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "payment-methods", 10, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const gate = await tfaGate(req, user.id);
  if (gate) return gate;

  const { provider, label, makeDefault } = await req.json().catch(() => ({}));
  if (!["crypto", "paddle"].includes(provider) || typeof label !== "string" || !label.trim() || label.length > 60) {
    return NextResponse.json({ error: "Provide a provider (crypto or paddle) and a label." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (makeDefault) {
    await admin.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
  }
  const { data: created, error } = await admin
    .from("payment_methods")
    .insert({ user_id: user.id, provider, label: label.trim(), is_default: !!makeDefault })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Could not save the payment method." }, { status: 500 });
  return NextResponse.json({ ok: true, id: created.id });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const gate = await tfaGate(req, user.id);
  if (gate) return gate;

  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: owned } = await admin
    .from("payment_methods").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await admin.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
  await admin.from("payment_methods").update({ is_default: true }).eq("id", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const gate = await tfaGate(req, user.id);
  if (gate) return gate;

  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("payment_methods").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
