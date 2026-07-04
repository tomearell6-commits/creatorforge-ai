import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCryptoInvoice } from "@/lib/payments/crypto";
import { PLANS } from "@/lib/constants";
import { limitRequestAsync } from "@/lib/security/ratelimit";

/** POST /api/billing/renew — checkout for ANOTHER period of the current plan. */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "billing-renew", 10, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("plan").eq("user_id", user.id).maybeSingle();
  const planObj = PLANS.find((p) => p.id === (profile?.plan ?? "free"));
  if (!planObj || planObj.custom || planObj.price <= 0) {
    return NextResponse.json({ error: "Your current plan has nothing to renew — choose a paid plan instead." }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  try {
    const { url } = await createCryptoInvoice({
      amount: planObj.price,
      orderId: `${user.id}|${planObj.id}`,
      description: `CreatorsForge AI — ${planObj.name} plan renewal`,
      ipnCallbackUrl: `${baseUrl}/api/webhooks/crypto`,
      successUrl: `${baseUrl}/dashboard/billing?checkout=success`,
      cancelUrl: `${baseUrl}/dashboard/billing?checkout=cancel`,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("billing renew checkout error:", e);
    return NextResponse.json({ error: "Could not start checkout. Try again." }, { status: 502 });
  }
}
