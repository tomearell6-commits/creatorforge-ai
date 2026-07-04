import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync, rateLimitAsync } from "@/lib/security/ratelimit";
import { verifyAnyFactor, getTwoFactorStatus } from "@/lib/security/twofactor";
import { issueTwoFactorCookie, TWO_FACTOR_COOKIE, TWO_FACTOR_COOKIE_MAX_AGE } from "@/lib/security/twofactor-cookie";
import { logSecurityEvent } from "@/lib/security/events";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { twoFactorFailedAttemptsEmail } from "@/lib/email/templates";

const FAILED_ALERT_THRESHOLD = 3;

/**
 * Second login step. The password step already created a session; the
 * middleware refuses /dashboard until this endpoint verifies an authenticator,
 * email, or backup code and sets the signed verification cookie.
 */
export async function POST(req: Request) {
  const ipLimit = await limitRequestAsync(req, "2fa-login", 20, 10 * 60_000);
  if (!ipLimit.ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Per-user limit so a distributed attack can't brute-force one account.
  const userLimit = await rateLimitAsync(`2fa-login-user:${user.id}`, { limit: 8, windowMs: 10 * 60_000 });
  if (!userLimit.ok) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });

  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Enter your verification code." }, { status: 400 });
  }

  const status = await getTwoFactorStatus(user.id);
  if (!status.enabled) return NextResponse.json({ error: "Two-factor authentication is not enabled." }, { status: 400 });

  const { ok, via } = await verifyAnyFactor(user.id, code, "login");
  if (!ok) {
    await logSecurityEvent({ eventType: "2FA_LOGIN_FAILED", req, userId: user.id });
    // Alert the account owner once when failures cross the threshold.
    const admin = createAdminClient();
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await admin
      .from("security_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "2FA_LOGIN_FAILED")
      .gte("created_at", since);
    if (count === FAILED_ALERT_THRESHOLD && emailConfigured() && user.email) {
      const tpl = twoFactorFailedAttemptsEmail(count);
      await sendEmail({ to: user.email, ...tpl }).catch(() => {});
    }
    return NextResponse.json({ error: "That code didn't match. Try again, or use a backup code." }, { status: 400 });
  }

  await logSecurityEvent({
    eventType: via === "backup" ? "2FA_BACKUP_CODE_USED" : "2FA_LOGIN_SUCCESS",
    req,
    userId: user.id,
    metadata: { via },
  });
  if (via === "backup") {
    await logSecurityEvent({ eventType: "2FA_LOGIN_SUCCESS", req, userId: user.id, metadata: { via } });
  }

  const res = NextResponse.json({ ok: true, via, backupCodesRemaining: via === "backup" ? Math.max(0, status.backupCodesRemaining - 1) : status.backupCodesRemaining });
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
