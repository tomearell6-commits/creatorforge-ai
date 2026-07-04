import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { beginTotpSetup, createEmailChallenge } from "@/lib/security/twofactor";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { twoFactorEmailCode } from "@/lib/email/templates";

/**
 * Begin 2FA enrollment. TOTP (recommended): returns the QR data-URL + manual
 * secret for the pending factor. Email method: emails a 6-digit setup code.
 * Nothing is enabled until verify-setup succeeds.
 */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "2fa-setup", 5, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { method = "totp" } = await req.json().catch(() => ({}));

  try {
    if (method === "email") {
      if (!emailConfigured()) {
        return NextResponse.json({ error: "Email verification is not available right now. Use an authenticator app instead." }, { status: 503 });
      }
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("user_2fa_settings").select("enabled").eq("user_id", user.id).maybeSingle();
      if (existing?.enabled) return NextResponse.json({ error: "Two-factor authentication is already enabled." }, { status: 400 });
      await admin.from("user_2fa_settings").upsert(
        { user_id: user.id, method: "email", secret_encrypted: null, enabled: false, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      const code = await createEmailChallenge(user.id, "setup");
      const tpl = twoFactorEmailCode(code, "setup");
      await sendEmail({ to: user.email, ...tpl });
      return NextResponse.json({ method: "email", sentTo: user.email });
    }

    const { secret, uri } = await beginTotpSetup(user.id, user.email);
    const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 240 });
    return NextResponse.json({ method: "totp", secret, uri, qrDataUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Setup failed" }, { status: 400 });
  }
}
