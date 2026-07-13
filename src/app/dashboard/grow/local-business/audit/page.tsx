import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProfileAudit } from "@/components/local-business/ProfileAudit";

export const metadata = { title: "Profile Audit — Local Business Studio" };

export default function ProfileAuditPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/grow/local-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Local Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Profile Audit</h1>
        <p className="mt-1 text-muted-foreground">Score a business location across completeness, content, brand, local SEO readiness, and engagement — with a prioritized action plan.</p>
      </div>
      <ProfileAudit />
    </div>
  );
}
