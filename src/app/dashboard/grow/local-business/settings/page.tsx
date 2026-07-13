import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LocalBusinessConnectionManager } from "@/components/local-business/LocalBusinessConnectionManager";

export const metadata = { title: "Local Business Settings — CreatorsForge AI" };

export default function LocalBusinessSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/local-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Local Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Google Business Profile — Settings</h1>
        <p className="mt-1 text-muted-foreground">Connect, review permissions, reconnect, or disconnect your Google account. Official sign-in only — we never store your password.</p>
      </div>
      <LocalBusinessConnectionManager />
    </div>
  );
}
