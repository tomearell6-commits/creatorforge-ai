import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCryptoProvider } from "@/lib/payments/providers";
import { quoteCustom } from "@/lib/credits/wallet";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { CREDIT_PACKAGES } from "@/lib/constants";
import { captureError } from "@/lib/logger";

/**
 * POST /api/wallet/topup
 *   { packageSlug } | { usd } | { credits }  + optional { currency }
 *
 * Creates a pending credit_purchases row and a crypto_payment_requests row, then
 * asks the configured crypto provider to create a payment. Credits are NOT issued
 * here — only the verified webhook (server-side) issues them. The order_reference
 * "topup|<userId>|<purchaseId>" lets the webhook credit the right purchase exactly
 * once. Amounts are computed server-side; client-supplied prices are ignored.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "wallet-topup", 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as {
    packageSlug?: string; usd?: number; credits?: number; currency?: string;
  };

  // Resolve credits + USD server-side.
  let credits = 0, usd = 0, fee = 0, packageSlug: string | null = null;
  if (body.packageSlug) {
    const { data: pkg } = await supabase
      .from("credit_packages").select("slug, usd_price, credits, bonus, is_active")
      .eq("slug", body.packageSlug).maybeSingle();
    const resolved = pkg?.is_active
      ? { credits: pkg.credits + (pkg.bonus ?? 0), usd: Number(pkg.usd_price), slug: pkg.slug }
      : (() => { const c = CREDIT_PACKAGES.find((p) => p.slug === body.packageSlug); return c ? { credits: c.credits + c.bonus, usd: c.usdPrice, slug: c.slug } : null; })();
    if (!resolved) return NextResponse.json({ error: "Unknown package." }, { status: 400 });
    credits = resolved.credits; usd = resolved.usd; packageSlug = resolved.slug;
  } else {
    const q = quoteCustom({ usd: body.usd, credits: body.credits });
    if (!q.ok) return NextResponse.json({ error: q.error }, { status: 400 });
    credits = q.credits; usd = q.usd; fee = q.fee;
  }

  const total = Math.round((usd + fee) * 100) / 100;

  // 1) Pending purchase row.
  const { data: purchase, error: pErr } = await supabase
    .from("credit_purchases")
    .insert({ user_id: user.id, package_slug: packageSlug, credits, usd_amount: usd, processing_fee: fee, status: "pending" })
    .select("id").single();
  if (pErr || !purchase) {
    captureError(pErr, { category: "payment", stage: "purchase_insert" });
    return NextResponse.json({ error: "Could not start top-up." }, { status: 500 });
  }

  const orderReference = `topup|${user.id}|${purchase.id}`;
  await supabase.from("credit_purchases").update({ payment_reference: orderReference }).eq("id", purchase.id);

  // 2) Record a pending transaction (history shows it immediately).
  await supabase.from("credit_transactions").insert({
    user_id: user.id, transaction_type: "purchase", credit_amount: credits, usd_amount: total,
    crypto_currency: body.currency ?? null, payment_status: "pending", payment_method: "crypto",
    payment_reference: orderReference, package_slug: packageSlug,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const provider = getCryptoProvider();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60 min

  // 3) Create the provider payment (or a simulated request if not configured).
  let invoiceUrl: string | undefined;
  let simulated = false;
  if (provider.isConfigured()) {
    try {
      const res = await provider.createPayment({
        amountUsd: total,
        orderReference,
        description: `CreatorForge AI — ${credits.toLocaleString()} credits`,
        currency: body.currency,
        ipnCallbackUrl: `${baseUrl}/api/webhooks/crypto`,
        successUrl: `${baseUrl}/dashboard/credits?topup=success`,
        cancelUrl: `${baseUrl}/dashboard/credits?topup=cancel`,
      });
      invoiceUrl = res.invoiceUrl;
    } catch (e) {
      captureError(e, { category: "payment", stage: "provider_create" });
      await supabase.from("credit_purchases").update({ status: "failed" }).eq("id", purchase.id);
      return NextResponse.json({ error: "Payment provider error. Please try again." }, { status: 502 });
    }
  } else {
    simulated = true; // No live gateway configured — architecture/preview mode.
  }

  // 4) Persist the payment request.
  const { data: reqRow } = await supabase
    .from("crypto_payment_requests")
    .insert({
      user_id: user.id, purchase_id: purchase.id, provider: provider.id,
      order_reference: orderReference, crypto_currency: body.currency ?? null,
      amount_usd: total, invoice_url: invoiceUrl ?? null, status: "waiting", expires_at: expiresAt,
    })
    .select("id").single();

  return NextResponse.json({
    purchaseId: purchase.id,
    paymentRequestId: reqRow?.id ?? null,
    orderReference,
    credits, usd, fee, total,
    currency: body.currency ?? null,
    invoiceUrl: invoiceUrl ?? null,
    expiresAt,
    simulated,
    note: simulated
      ? "Crypto gateway not configured (NOWPAYMENTS_API_KEY). Showing the checkout flow in preview mode — set the key to accept live payments."
      : undefined,
  });
}
