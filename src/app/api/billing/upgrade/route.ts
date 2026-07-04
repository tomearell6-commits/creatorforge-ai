import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCryptoInvoice } from "@/lib/payments/crypto";
import { PLANS } from "@/lib/constants";
import { limitRequestAsync } from "@/lib/security/ratelimit";

/**
 * POST /api/billing/upgrade { plan } — create a crypto checkout for a paid
 * plan (upgrade, downgrade, or renewal — the webhook works out which). Card
 * payments via Paddle activate automatically once Paddle verification clears.
 */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "billing-upgrade", 10, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json().catch(() => ({}));
  const planObj = PLANS.find((p) => p.id === plan);
  if (!planObj || planObj.custom || planObj.price <= 0) {
    return NextResponse.json({ error: "Invalid plan. Enterprise plans are arranged via sales." }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  try {
    const { url } = await createCryptoInvoice({
      amount: planObj.price,
      orderId: `${user.id}|${planObj.id}`,
      description: `CreatorsForge AI — ${planObj.name} plan`,
      ipnCallbackUrl: `${baseUrl}/api/webhooks/crypto`,
      successUrl: `${baseUrl}/dashboard/billing?checkout=success`,
      cancelUrl: `${baseUrl}/dashboard/billing/plans?checkout=cancel`,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("billing upgrade checkout error:", e);
    return NextResponse.json({ error: "Could not start checkout. Try again." }, { status: 502 });
  }
}
