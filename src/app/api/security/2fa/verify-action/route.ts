import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync, rateLimitAsync } from "@/lib/security/ratelimit";
import { verifyAnyFactor, userHas2faEnabled } from "@/lib/security/twofactor";
import { issueActionToken } from "@/lib/security/twofactor-cookie";
import { logSecurityEvent } from "@/lib/security/events";

/**
 * High-risk action confirmation. Verifies a current 2FA/backup code and returns
 * a 5-minute action token the client passes back as the `x-2fa-token` header to
 * protected routes (password change, payout settings, key rotation, …).
 */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "2fa-action", 15, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userLimit = await rateLimitAsync(`2fa-action-user:${user.id}`, { limit: 8, windowMs: 10 * 60_000 });
  if (!userLimit.ok) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });

  if (!(await userHas2faEnabled(user.id))) {
    return NextResponse.json({ error: "Two-factor authentication is not enabled." }, { status: 400 });
  }

  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Enter your verification code." }, { status: 400 });
  }

  const { ok, via } = await verifyAnyFactor(user.id, code, "action");
  if (!ok) {
    await logSecurityEvent({ eventType: "2FA_LOGIN_FAILED", req, userId: user.id, metadata: { purpose: "action" } });
    return NextResponse.json({ error: "That code didn't match." }, { status: 400 });
  }
  if (via === "backup") {
    await logSecurityEvent({ eventType: "2FA_BACKUP_CODE_USED", req, userId: user.id, metadata: { purpose: "action" } });
  }
  await logSecurityEvent({ eventType: "2FA_REQUIRED_FOR_ACTION", req, userId: user.id, metadata: { via } });

  const actionToken = await issueActionToken(user.id);
  if (!actionToken) return NextResponse.json({ error: "Server signing key missing." }, { status: 503 });
  return NextResponse.json({ ok: true, actionToken, expiresInSec: 300 });
}
