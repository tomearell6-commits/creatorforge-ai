import { Admin2FAEnforcementPanel } from "@/components/admin/Admin2FAEnforcementPanel";

export const metadata = { title: "Security & 2FA — Admin — CreatorsForge AI" };

export default function AdminSecurityPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Security &amp; 2FA</h1>
      <p className="mt-1 text-muted-foreground">
        Platform two-factor authentication policy and admin account protection.
      </p>
      <div className="mt-6">
        <Admin2FAEnforcementPanel />
      </div>
    </div>
  );
}
