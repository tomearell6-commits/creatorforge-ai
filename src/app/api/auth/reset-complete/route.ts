import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/security/events";
import { sendEmail } from "@/lib/email/send";
import { passwordChangedEmail } from "@/lib/email/templates";

/**
 * POST /api/auth/reset-complete
 * Called right after a successful password reset (the recovery session is
 * active). Records PASSWORD_RESET_COMPLETED, revokes other sessions, and emails
 * the change confirmation. The password update itself happens client-side via
 * supabase.auth.updateUser during the recovery session.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "No active reset session." }, { status: 401 });

  await supabase.auth.signOut({ scope: "others" }).catch(() => {});
  await logSecurityEvent({ eventType: "PASSWORD_RESET_COMPLETED", req: request, userId: user.id, metadata: { via: "reset_link" } });

  const mail = passwordChangedEmail();
  await sendEmail({ to: user.email, subject: mail.subject, html: mail.html, text: mail.text });

  return NextResponse.json({ ok: true });
}
