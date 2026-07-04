import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync, rateLimitAsync } from "@/lib/security/ratelimit";
import { createEmailChallenge, type ChallengePurpose } from "@/lib/security/twofactor";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { twoFactorEmailCode } from "@/lib/email/templates";

const PURPOSES: ChallengePurpose[] = ["login", "action", "setup"];

/** (Re)send a 6-digit email code for email-method users. Tightly rate-limited. */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "2fa-email-code", 6, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userLimit = await rateLimitAsync(`2fa-email-user:${user.id}`, { limit: 3, windowMs: 10 * 60_000 });
  if (!userLimit.ok) return NextResponse.json({ error: "Please wait before requesting another code." }, { status: 429 });

  if (!emailConfigured()) return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });

  const { purpose } = await req.json().catch(() => ({}));
  if (!PURPOSES.includes(purpose)) return NextResponse.json({ error: "Invalid purpose." }, { status: 400 });

  // Only email-method (or pending-setup) accounts may request codes.
  const admin = createAdminClient();
  const { data: s } = await admin
    .from("user_2fa_settings").select("method, enabled").eq("user_id", user.id).maybeSingle();
  if (!s || (purpose !== "setup" && (!s.enabled || s.method !== "email"))) {
    return NextResponse.json({ error: "Email verification is not set up for this account." }, { status: 400 });
  }

  const code = await createEmailChallenge(user.id, purpose);
  const tpl = twoFactorEmailCode(code, purpose);
  const r = await sendEmail({ to: user.email, ...tpl });
  if (!r.sent) return NextResponse.json({ error: "Could not send the email. Try again." }, { status: 502 });
  return NextResponse.json({ ok: true, sentTo: user.email });
}
