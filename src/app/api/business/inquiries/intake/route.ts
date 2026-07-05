import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { inquiryLooksSensitive } from "@/lib/business/ai";
import { notify } from "@/lib/notifications/service";

/**
 * PUBLIC inquiry intake — website contact forms POST here with the owner's
 * form key (Business Settings). No auth cookie; the key scopes the inquiry to
 * its owner. Tightly rate-limited and size-capped.
 *
 *   POST /api/business/inquiries/intake
 *   { key, name?, email?, phone?, subject?, message }
 */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "biz-intake", 10, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!/^[a-f0-9]{32}$/.test(key) || !message) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("business_ops_settings").select("user_id").eq("form_key", key).maybeSingle();
  if (!settings) return NextResponse.json({ error: "Invalid submission." }, { status: 400 });

  const subject = String(body.subject ?? "Website inquiry").slice(0, 300);
  const { error } = await admin.from("business_inquiries").insert({
    user_id: settings.user_id,
    source: "form",
    customer_name: typeof body.name === "string" ? body.name.slice(0, 200) : null,
    customer_email: typeof body.email === "string" ? body.email.slice(0, 200) : null,
    customer_phone: typeof body.phone === "string" ? body.phone.slice(0, 60) : null,
    subject,
    message: message.slice(0, 8000),
    is_sensitive: inquiryLooksSensitive(`${subject} ${message}`),
  });
  if (error) return NextResponse.json({ error: "Could not record the inquiry." }, { status: 500 });

  // Bell notification (in-app only; category piggybacks on existing prefs).
  await notify(admin, {
    userId: settings.user_id,
    email: null,
    type: "business_inquiry",
    category: "subscription",
    title: "New website inquiry",
    message: subject,
    ctaLabel: "Open Inquiry Center",
    ctaUrl: "/dashboard/business/inquiries",
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
