import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCryptoInvoice } from "@/lib/payments/crypto";
import { PLANS } from "@/lib/constants";

/**
 * POST /api/crypto/checkout -> create a NOWPayments invoice for a paid plan and
 * return its hosted URL. The order_id encodes "<userId>|<plan>" so the IPN
 * webhook can grant credits to the right user.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await request.json();
  const planObj = PLANS.find((p) => p.id === plan);
  if (!planObj || planObj.price <= 0) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  try {
    const { url } = await createCryptoInvoice({
      amount: planObj.price,
      orderId: `${user.id}|${plan}`,
      description: `CreatorForge AI — ${planObj.name} plan`,
      ipnCallbackUrl: `${baseUrl}/api/webhooks/crypto`,
      successUrl: `${baseUrl}/dashboard/billing?crypto=success`,
      cancelUrl: `${baseUrl}/dashboard/billing?crypto=cancel`,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("crypto checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not start crypto checkout." },
      { status: 502 }
    );
  }
}
