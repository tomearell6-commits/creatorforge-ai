import { Suspense } from "react";
import Link from "next/link";
import { isPlatformAdmin } from "@/lib/admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { userHas2faEnabled, isAdmin2faEnforced } from "@/lib/security/twofactor";

export const metadata = { title: "Admin Portal — CreatorsForge AI" };

/**
 * Admins without 2FA see a standing warning (and a hard notice once enforcement is
 * active — sensitive admin APIs already reject them). It loads on its own so it never
 * delays the page; both lookups run at the same time.
 */
async function TwoFactorBanner({ userId }: { userId: string }) {
  const [has2fa, enforcedSetting] = await Promise.all([userHas2faEnabled(userId), isAdmin2faEnforced()]);
  if (has2fa) return null;
  const enforced = enforcedSetting;
  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        enforced
          ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400"
          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      }`}
    >
      <strong>{enforced ? "2FA required:" : "Security recommendation:"}</strong>{" "}
      {enforced
        ? "Admin 2FA enforcement is active — sensitive admin actions are blocked until you enable two-factor authentication."
        : "Your admin account does not have two-factor authentication enabled."}{" "}
      <Link href="/dashboard/settings" className="font-semibold underline">
        Enable 2FA in Settings →
      </Link>
    </div>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ok, user } = await isPlatformAdmin();

  if (!ok) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-bold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is restricted to platform administrators. Add your email to
            <code className="mx-1">ADMIN_EMAILS</code> or an <code>admin_users</code> row.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-brand-600 underline">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6">
        {user && (
          <Suspense fallback={null}>
            <TwoFactorBanner userId={user.id} />
          </Suspense>
        )}
        {children}
      </main>
    </div>
  );
}
