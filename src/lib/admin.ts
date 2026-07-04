/**
 * Admin gate (Phase 6 → 7). Two ways to be a platform admin:
 *  1. email listed in ADMIN_EMAILS (bootstrap, no DB needed), or
 *  2. a row in admin_users (managed in-app).
 * `requireAdmin` resolves the calling user and returns an admin client when
 * authorized, or an error response to return directly from a route.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export function isAdminEmail(email?: string | null): boolean {
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

/** Server-side admin check: email allowlist OR admin_users row. */
export async function isPlatformAdmin(): Promise<{ ok: boolean; user: { id: string; email?: string } | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, user: null };
  if (isAdminEmail(user.email)) return { ok: true, user: { id: user.id, email: user.email ?? undefined } };

  const admin = createAdminClient();
  const { data } = await admin.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
  return { ok: !!data, user: { id: user.id, email: user.email ?? undefined } };
}

/**
 * Use at the top of an admin API route:
 *   const gate = await requireAdmin(); if ("error" in gate) return gate.error;
 *   const { admin, user } = gate;
 *
 * When admin 2FA enforcement is active (security_settings.enforce_admin_2fa),
 * admins without 2FA are rejected. Pass skip2faEnforcement for the few routes
 * an admin needs to see WHY they're blocked (the security panel itself).
 */
export async function requireAdmin(opts?: { skip2faEnforcement?: boolean }): Promise<
  | { error: NextResponse }
  | { admin: ReturnType<typeof createAdminClient>; user: { id: string; email?: string } }
> {
  const { ok, user } = await isPlatformAdmin();
  if (!ok || !user) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!opts?.skip2faEnforcement) {
    const { isAdmin2faEnforced, userHas2faEnabled } = await import("@/lib/security/twofactor");
    if ((await isAdmin2faEnforced()) && !(await userHas2faEnabled(user.id))) {
      return {
        error: NextResponse.json(
          { error: "Two-factor authentication is required for admin actions. Enable 2FA in Settings → Security." },
          { status: 403 }
        ),
      };
    }
  }
  return { admin: createAdminClient(), user };
}
