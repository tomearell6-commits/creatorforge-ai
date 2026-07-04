import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { confirmPassword, verifyAnyFactor, disableTwoFactor, userHas2faEnabled } from "@/lib/security/twofactor";
import { TWO_FACTOR_COOKIE } from "@/lib/security/twofactor-cookie";
import { logSecurityEvent } from "@/lib/security/events";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { twoFactorDisabledEmail } from "@/lib/email/templates";

/** Disable 2FA — requires the account password AND a current 2FA/backup code. */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "2fa-disable", 5, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await userHas2faEnabled(user.id))) {
    return NextResponse.json({ error: "Two-factor authentication is not enabled." }, { status: 400 });
  }

  const { password, code } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Confirm your password to disable 2FA." }, { status: 400 });
  }
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Enter a current verification or backup code." }, { status: 400 });
  }

  if (!(await confirmPassword(user.email, password))) {
    return NextResponse.json({ error: "Password is incorrect." }, { status: 400 });
  }
  const { ok } = await verifyAnyFactor(user.id, code, "action");
  if (!ok) return NextResponse.json({ error: "That verification code didn't match." }, { status: 400 });

  await disableTwoFactor(user.id);
  await logSecurityEvent({ eventType: "2FA_DISABLED", req, userId: user.id });
  if (emailConfigured()) {
    const tpl = twoFactorDisabledEmail();
    await sendEmail({ to: user.email, ...tpl }).catch(() => {});
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(TWO_FACTOR_COOKIE);
  return res;
}
