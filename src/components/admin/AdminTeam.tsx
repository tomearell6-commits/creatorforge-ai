"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { ShieldCheck, UserPlus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Role = "super_admin" | "admin" | "support";

type Admin = {
  id: string;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  role: Role;
  source: "database" | "env";
  createdAt: string | null;
  revocable: boolean;
};

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  support: "Support",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function AdminTeam() {
  const emailId = useId();
  const roleId = useId();
  const { confirm, dialog, setLoading, close } = useConfirm();

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setListLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ variant: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    setListLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/team", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to load admins.");
      setAdmins(json.admins as Admin[]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load admins.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to grant admin access.");
      setFeedback({ variant: "success", message: json.message });
      setEmail("");
      setRole("admin");
      await load();
    } catch (err) {
      setFeedback({ variant: "error", message: err instanceof Error ? err.message : "Failed to grant admin access." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(target: Admin) {
    if (!target.userId) return;
    const ok = await confirm({
      title: "Revoke admin access?",
      description: (
        <>
          <strong>{target.email ?? target.userId}</strong> will lose access to the admin portal.
          You can grant it again at any time.
        </>
      ),
      confirmLabel: "Revoke access",
      danger: true,
    });
    if (!ok) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: target.userId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to revoke access.");
      setFeedback({ variant: "success", message: json.message });
      await load();
    } catch (err) {
      setFeedback({ variant: "error", message: err instanceof Error ? err.message : "Failed to revoke access." });
    } finally {
      close();
    }
  }

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Grant platform-admin access to teammates by email. They must already have a CreatorsForge
        account — ask them to sign up first, then promote them here. Access is stored durably in the
        database, so it survives independently of environment configuration.
      </p>

      {/* Grant form */}
      <form
        onSubmit={handleGrant}
        className="rounded-xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserPlus className="h-4 w-4 text-brand-600" aria-hidden />
          Add a teammate
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor={emailId} className="mb-1 block text-xs font-medium text-muted-foreground">
              Teammate email
            </label>
            <input
              id={emailId}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div className="sm:w-44">
            <label htmlFor={roleId} className="mb-1 block text-xs font-medium text-muted-foreground">
              Role
            </label>
            <select
              id={roleId}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="super_admin">Super admin</option>
              <option value="admin">Admin</option>
              <option value="support">Support</option>
            </select>
          </div>
          <Button type="submit" disabled={submitting} className="sm:w-auto">
            {submitting ? <Spinner size="sm" className="text-current" /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
            Grant access
          </Button>
        </div>
        {feedback && (
          <Alert variant={feedback.variant} className="mt-4">
            {feedback.message}
          </Alert>
        )}
      </form>

      {/* Admin list */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground sm:px-5">
          Current admins
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
            <Spinner size="sm" /> Loading admins…
          </div>
        ) : loadError ? (
          <div className="p-4 sm:p-5">
            <Alert variant="error" action={<Button variant="ghost" onClick={() => void load()}>Retry</Button>}>
              {loadError}
            </Alert>
          </div>
        ) : admins.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No admins yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium sm:px-5">Admin</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Added</th>
                  <th className="px-4 py-2 font-medium sm:px-5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 sm:px-5">
                      <div className="font-medium text-foreground">{a.email ?? "(unknown email)"}</div>
                      {a.fullName && <div className="text-xs text-muted-foreground">{a.fullName}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={a.role === "super_admin" ? "brand" : "default"}>{ROLE_LABEL[a.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {a.source === "database" ? (
                        <span className="text-muted-foreground">Database</span>
                      ) : (
                        <Badge variant="warning">Env allowlist</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      {a.revocable ? (
                        <Button
                          variant="ghost"
                          onClick={() => void handleRevoke(a)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                          aria-label={`Revoke admin access for ${a.email ?? "user"}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Revoke
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Managed via ADMIN_EMAILS</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog}
    </div>
  );
}
