import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { quoteCustom } from "@/lib/credits/wallet";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { CREDIT_PACKAGES, PLANS, planCredits } from "@/lib/constants";
import { isFlutterwaveConfigured, createFlutterwavePayment } from "@/lib/payments/flutterwave";
import { captureError } from "@/lib/logger";

/**
 * POST /api/flutterwave/checkout
 *   { kind: "topup", packageSlug } | { kind: "topup", usd|credits } | { kind: "plan", plan }
 *
 * Creates a pending flutterwave_payments row and a Flutterwave hosted-checkout,
 * returning the payment link. Credits/plans are granted only by the verified
 * webhook. Amounts are computed server-side. Fully separate from crypto/Paddle.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "flw-checkout", 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as {
    kind?: "topup" | "plan"; packageSlug?: string; usd?: number; credits?: number; plan?: string;
  };
  const kind = body.kind === "plan" ? "plan" : "topup";

  // Resolve amount + what's being bought (server-side).
  let credits = 0, usd = 0, plan: string | null = null, description = "";
  if (kind === "plan") {
    const p = PLANS.find((x) => x.id === body.plan);
    if (!p) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
    if (p.custom || p.price <= 0) return NextResponse.json({ error: "This plan isn't purchasable here." }, { status: 400 });
    plan = p.id; usd = p.price; credits = planCredits(p.id);
    description = `${p.name} plan — ${credits.toLocaleString()} credits / month`;
  } else if (body.packageSlug) {
    const c = CREDIT_PACKAGES.find((x) => x.slug === body.packageSlug);
    if (!c) return NextResponse.json({ error: "Unknown package." }, { status: 400 });
    credits = c.credits + c.bonus; usd = c.usdPrice;
    description = `${credits.toLocaleString()} credits`;
  } else {
    const q = quoteCustom({ usd: body.usd, credits: body.credits });
    if (!q.ok) return NextResponse.json({ error: q.error }, { status: 400 });
    credits = q.credits; usd = q.usd;
    description = `${credits.toLocaleString()} credits`;
  }

  const txRef = `flw_${kind}_${user.id.slice(0, 8)}_${crypto.randomUUID()}`;

  // Pending record (owner-insert allowed by RLS).
  const { error: insErr } = await supabase.from("flutterwave_payments").insert({
    user_id: user.id, tx_ref: txRef, kind, plan, credits, amount_usd: usd, currency: "USD", status: "pending",
  });
  if (insErr) {
    captureError(insErr, { category: "payment", provider: "flutterwave", stage: "insert" });
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const redirectUrl = `${baseUrl}/dashboard/${kind === "plan" ? "billing" : "credits"}?flw=return`;

  if (!isFlutterwaveConfigured()) {
    return NextResponse.json({
      simulated: true, txRef, credits, usd, plan,
      note: "Flutterwave not configured yet (FLUTTERWAVE_SECRET_KEY). Add your keys in Vercel to accept live card + mobile-money payments.",
    });
  }

  try {
    const { link } = await createFlutterwavePayment({
      txRef,
      amount: usd,
      currency: "USD",
      redirectUrl,
      customerEmail: user.email ?? `user-${user.id.slice(0, 8)}@creatorsforge.io`,
      title: "CreatorsForge",
      description,
      meta: { userId: user.id, kind, plan: plan ?? "", credits },
    });
    return NextResponse.json({ link, txRef, credits, usd, plan });
  } catch (e) {
    captureError(e, { category: "payment", provider: "flutterwave", stage: "create" });
    await supabase.from("flutterwave_payments").update({ status: "failed" }).eq("tx_ref", txRef);
    return NextResponse.json({ error: "Payment provider error. Please try again." }, { status: 502 });
  }
}
