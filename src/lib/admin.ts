/**
 * Admin gate (Phase 6 — Module 8). Admins are listed in ADMIN_EMAILS (comma
 * separated). Kept env-based so no schema/role migration is needed yet.
 */
export function isAdminEmail(email?: string | null): boolean {
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}
