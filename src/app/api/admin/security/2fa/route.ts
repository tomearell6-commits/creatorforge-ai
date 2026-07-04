import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { isAdmin2faEnforced, setAdmin2faEnforced, userHas2faEnabled } from "@/lib/security/twofactor";
import { logSecurityEvent } from "@/lib/security/events";

/** Admin Panel → Security → 2FA Enforcement: status of every admin + the flag. */
export async function GET() {
  // skip2faEnforcement: a blocked admin must still be able to SEE this panel.
  const gate = await requireAdmin({ skip2faEnforcement: true });
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const enforced = await isAdmin2faEnforced();

  // Collect admins from both sources: allowlist env + admin_users table.
  const emails = (process.env.ADMIN_EMAILS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const { data: rows } = await admin.from("admin_users").select("user_id");
  const ids = new Set<string>((rows ?? []).map((r) => r.user_id as string));

  // Resolve allowlisted emails to users (paged listUsers covers small teams).
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const admins: { email: string; has2fa: boolean }[] = [];
  for (const u of list?.users ?? []) {
    const isListed = !!u.email && emails.includes(u.email.toLowerCase());
    if (!isListed && !ids.has(u.id)) continue;
    admins.push({ email: u.email ?? u.id, has2fa: await userHas2faEnabled(u.id) });
  }

  return NextResponse.json({ enforced, admins });
}

/** Toggle enforcement. Turning it ON requires the acting admin to have 2FA. */
export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;

  const { enforced } = await req.json().catch(() => ({}));
  if (typeof enforced !== "boolean") {
    return NextResponse.json({ error: "enforced must be true or false" }, { status: 400 });
  }
  if (enforced && !(await userHas2faEnabled(user.id))) {
    return NextResponse.json(
      { error: "Enable 2FA on your own account first — otherwise enforcement would lock you out." },
      { status: 400 }
    );
  }

  await setAdmin2faEnforced(enforced, user.id);
  await logSecurityEvent({
    eventType: "2FA_REQUIRED_FOR_ACTION",
    req,
    userId: user.id,
    metadata: { action: "admin_2fa_enforcement", enforced },
  });
  return NextResponse.json({ ok: true, enforced });
}
