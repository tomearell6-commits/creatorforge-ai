import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { confirmPassword, issueBackupCodes, userHas2faEnabled } from "@/lib/security/twofactor";
import { logSecurityEvent } from "@/lib/security/events";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { backupCodesRegeneratedEmail } from "@/lib/email/templates";

/** Replace all backup codes (password confirmation required). Shown ONCE. */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "2fa-regen", 3, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await userHas2faEnabled(user.id))) {
    return NextResponse.json({ error: "Two-factor authentication is not enabled." }, { status: 400 });
  }

  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Confirm your password to regenerate backup codes." }, { status: 400 });
  }
  if (!(await confirmPassword(user.email, password))) {
    return NextResponse.json({ error: "Password is incorrect." }, { status: 400 });
  }

  const backupCodes = await issueBackupCodes(user.id);
  await logSecurityEvent({ eventType: "2FA_BACKUP_CODES_REGENERATED", req, userId: user.id });
  if (emailConfigured()) {
    const tpl = backupCodesRegeneratedEmail();
    await sendEmail({ to: user.email, ...tpl }).catch(() => {});
  }
  return NextResponse.json({ ok: true, backupCodes });
}
