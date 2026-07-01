import Link from "next/link";
import { isPlatformAdmin } from "@/lib/admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata = { title: "Admin Portal — CreatorsForge AI" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ok } = await isPlatformAdmin();

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
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
