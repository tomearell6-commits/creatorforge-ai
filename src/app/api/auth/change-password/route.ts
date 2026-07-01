import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { logSecurityEvent } from "@/lib/security/events";
import { validatePassword } from "@/lib/security/password";
import { sendEmail } from "@/lib/email/send";
import { passwordChangedEmail } from "@/lib/email/templates";

/**
 * POST /api/auth/change-password  { currentPassword, newPassword }
 * Authenticated. Re-verifies the current password, enforces the strength
 * policy, updates it, revokes other sessions, logs the event, and emails a
 * confirmation. Never logs passwords.
 */
export async function POST(request: Request) {
  const rl = await limitRequestAsync(request, "change-password", 10, 15 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = (await request.json().catch(() => ({}))) as {
    currentPassword?: string; newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }

  // Enforce the password policy server-side (never trust the client).
  const { ok, errors } = validatePassword(newPassword);
  if (!ok) return NextResponse.json({ error: "Password too weak.", details: errors }, { status: 400 });
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "New password must be different from the current one." }, { status: 400 });
  }

  // Verify the CURRENT password on a throwaway client so we don't disturb the
  // cookie-bound session. Wrong password → record a failed attempt.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const verifier = createSupabaseClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: verifyError } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verifyError) {
    await logSecurityEvent({ eventType: "PASSWORD_CHANGE_FAILED", req: request, userId: user.id, metadata: { reason: "wrong_current_password" } });
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
  }

  // Apply the change on the authenticated (cookie-bound) client.
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    await logSecurityEvent({ eventType: "PASSWORD_CHANGE_FAILED", req: request, userId: user.id, metadata: { reason: "update_failed" } });
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // Invalidate other sessions, keeping the current one active.
  await supabase.auth.signOut({ scope: "others" }).catch(() => {});

  await logSecurityEvent({ eventType: "PASSWORD_CHANGED", req: request, userId: user.id, metadata: { via: "settings" } });
  const mail = passwordChangedEmail();
  await sendEmail({ to: user.email, subject: mail.subject, html: mail.html, text: mail.text });

  return NextResponse.json({ ok: true });
}
