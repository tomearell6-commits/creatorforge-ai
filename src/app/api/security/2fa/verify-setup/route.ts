import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { completeTotpSetup, verifyEmailChallenge, issueBackupCodes } from "@/lib/security/twofactor";
import { issueTwoFactorCookie, TWO_FACTOR_COOKIE, TWO_FACTOR_COOKIE_MAX_AGE } from "@/lib/security/twofactor-cookie";
import { logSecurityEvent } from "@/lib/security/events";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { twoFactorEnabledEmail } from "@/lib/email/templates";

/**
 * Complete enrollment: verify the code against the PENDING factor. On success,
 * 2FA turns on, 10 backup codes are returned (shown ONCE), this browser gets
 * the verification cookie (so the user isn't immediately re-challenged), and a
 * confirmation email is sent.
 */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "2fa-verify-setup", 10, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Enter the verification code." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("user_2fa_settings").select("method, enabled").eq("user_id", user.id).maybeSingle();
  if (!pending || pending.enabled) {
    return NextResponse.json({ error: "No pending 2FA setup found. Start again." }, { status: 400 });
  }

  let backupCodes: string[] | undefined;
  if (pending.method === "totp") {
    const result = await completeTotpSetup(user.id, code);
    if (!result.ok) return NextResponse.json({ error: "That code didn't match. Check your authenticator app and try again." }, { status: 400 });
    backupCodes = result.backupCodes;
  } else {
    const ok = await verifyEmailChallenge(user.id, "setup", code);
    if (!ok) return NextResponse.json({ error: "That code didn't match or has expired. Request a new one." }, { status: 400 });
    const now = new Date().toISOString();
    await admin
      .from("user_2fa_settings")
      .update({ enabled: true, enabled_at: now, last_verified_at: now, updated_at: now })
      .eq("user_id", user.id);
    backupCodes = await issueBackupCodes(user.id);
  }

  await logSecurityEvent({ eventType: "2FA_ENABLED", req, userId: user.id, metadata: { method: pending.method } });
  if (emailConfigured()) {
    const tpl = twoFactorEnabledEmail();
    await sendEmail({ to: user.email, ...tpl }).catch(() => {});
  }

  const res = NextResponse.json({ ok: true, backupCodes });
  const cookie = await issueTwoFactorCookie(user.id);
  if (cookie) {
    res.cookies.set(TWO_FACTOR_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TWO_FACTOR_COOKIE_MAX_AGE,
      path: "/",
    });
  }
  return res;
}
