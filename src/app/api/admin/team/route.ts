import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Role = "super_admin" | "admin" | "support";
const ROLES: Role[] = ["super_admin", "admin", "support"];

/** Page through auth.users to find one by (case-insensitive) email. */
async function findUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<{ id: string; email: string } | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return { id: hit.id, email: hit.email ?? target };
    if (users.length < 200) break;
  }
  return null;
}

/**
 * GET /api/admin/team — list platform admins.
 *
 * Combines durable database admins (admin_users rows, enriched with email /
 * name) with env-allowlist admins (ADMIN_EMAILS) so the operator sees every
 * account that currently passes the admin gate and where its access comes from.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("admin_users")
    .select("id, user_id, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    const missing = /relation .*admin_users.* does not exist/i.test(error.message);
    return NextResponse.json(
      {
        ok: false,
        message: missing
          ? "The admin_users table is missing — run database migration 0007."
          : error.message,
      },
      { status: missing ? 409 : 500 }
    );
  }

  // Enrich each DB admin with email + display name.
  const dbAdmins = await Promise.all(
    (rows ?? []).map(async (r) => {
      let email: string | null = null;
      try {
        const { data } = await admin.auth.admin.getUserById(r.user_id);
        email = data?.user?.email ?? null;
      } catch {
        /* user may have been deleted from auth; leave email null */
      }
      let fullName: string | null = null;
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", r.user_id)
        .maybeSingle();
      fullName = profile?.full_name ?? null;
      return {
        id: r.id,
        userId: r.user_id,
        email,
        fullName,
        role: r.role as Role,
        source: "database" as const,
        createdAt: r.created_at,
        revocable: true,
      };
    })
  );

  // Env-allowlist admins that don't also have a DB row (informational only).
  const dbEmails = new Set(dbAdmins.map((a) => (a.email ?? "").toLowerCase()).filter(Boolean));
  const envEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .filter((e) => !dbEmails.has(e.toLowerCase()));

  const envAdmins = envEmails.map((email) => ({
    id: `env:${email.toLowerCase()}`,
    userId: null as string | null,
    email,
    fullName: null as string | null,
    role: "super_admin" as Role,
    source: "env" as const,
    createdAt: null as string | null,
    revocable: false,
  }));

  return NextResponse.json({ ok: true, admins: [...dbAdmins, ...envAdmins] });
}

/**
 * POST /api/admin/team — grant admin to an existing user by email.
 *
 * Body: { email: string, role?: "super_admin"|"admin"|"support" }.
 * The account must already exist (have signed up); this promotes it by
 * upserting an admin_users row. Idempotent — re-granting updates the role.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;

  let body: { email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const role = (body.role ?? "admin") as Role;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 });
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ ok: false, message: "Invalid role." }, { status: 400 });
  }

  const admin = createAdminClient();

  let found: { id: string; email: string } | null;
  try {
    found = await findUserByEmail(admin, email);
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Failed to look up user." },
      { status: 502 }
    );
  }

  if (!found) {
    return NextResponse.json(
      {
        ok: false,
        message: `No account found for ${email}. Ask them to sign up first, then grant admin access.`,
      },
      { status: 404 }
    );
  }

  const { data: row, error } = await admin
    .from("admin_users")
    .upsert({ user_id: found.id, role }, { onConflict: "user_id" })
    .select("id, role")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  await logAudit(admin, {
    userId: user.id,
    actorEmail: user.email ?? null,
    action: "admin.team.grant",
    targetType: "admin_user",
    targetId: found.id,
    metadata: { email: found.email, role },
  });

  return NextResponse.json({
    ok: true,
    message: `${found.email} is now a platform admin (${role}).`,
    admin: { id: row.id, userId: found.id, email: found.email, role },
  });
}

/**
 * DELETE /api/admin/team — revoke a database admin.
 *
 * Body: { userId: string }. Refuses to revoke your own row (self-lockout
 * guard) and only affects durable admin_users rows — env-allowlist admins are
 * managed through the ADMIN_EMAILS environment variable.
 */
export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const userId = (body.userId ?? "").trim();
  if (!userId) {
    return NextResponse.json({ ok: false, message: "Missing userId." }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json(
      { ok: false, message: "You can't revoke your own admin access." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Capture the target email for the audit log before deleting.
  let targetEmail: string | null = null;
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    targetEmail = data?.user?.email ?? null;
  } catch {
    /* auth user may be gone; proceed with revoke regardless */
  }

  const { error } = await admin.from("admin_users").delete().eq("user_id", userId);
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  await logAudit(admin, {
    userId: user.id,
    actorEmail: user.email ?? null,
    action: "admin.team.revoke",
    targetType: "admin_user",
    targetId: userId,
    metadata: { email: targetEmail },
  });

  const stillEnvAdmin = targetEmail ? isAdminEmail(targetEmail) : false;
  return NextResponse.json({
    ok: true,
    message: stillEnvAdmin
      ? `Removed the database admin row, but ${targetEmail} is still an admin via the ADMIN_EMAILS environment variable.`
      : "Admin access revoked.",
  });
}
