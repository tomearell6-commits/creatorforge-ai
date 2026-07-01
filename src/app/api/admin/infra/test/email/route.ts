import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sendEmail, emailConfigured } from "@/lib/email/send";

/**
 * POST /api/admin/infra/test/email — admin-only Brevo send test.
 *
 * Sends a single transactional email to the calling admin's OWN address (never
 * a third party) to verify the Brevo API key + authenticated sending domain
 * work end to end. Reports the sender used and Brevo's send result.
 */
export async function POST() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const to = gate.user.email;
  const sender = process.env.BREVO_SENDER_EMAIL || "no-reply@creatorsforge.io";

  if (!emailConfigured()) {
    return NextResponse.json({ ok: false, configured: false, message: "BREVO_API_KEY is not set." }, { status: 400 });
  }
  if (!to) {
    return NextResponse.json({ ok: false, message: "Admin account has no email address." }, { status: 400 });
  }

  const result = await sendEmail({
    to,
    subject: "CreatorForge — Brevo test email ✅",
    html: `<div style="font-family:sans-serif;line-height:1.5">
      <h2>Brevo is working 🎉</h2>
      <p>This is a live test email sent from your CreatorForge app through Brevo,
      using the authenticated sender <strong>${sender}</strong>.</p>
      <p>If you're reading this in your inbox (not spam), your domain authentication
      and Brevo integration are fully operational.</p>
    </div>`,
    text: `Brevo is working. Test email from ${sender} via CreatorForge.`,
  });

  return NextResponse.json({
    ok: result.sent,
    sentTo: to,
    sender,
    error: result.error ?? null,
    message: result.sent
      ? `Test email sent to ${to} from ${sender}. Check your inbox (and spam folder just in case).`
      : `Brevo did not accept the send: ${result.error ?? "unknown error"}.`,
  });
}
