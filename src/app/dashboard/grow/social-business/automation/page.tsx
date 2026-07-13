import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SocialAutomationRuleBuilder } from "@/components/social-business/SocialAutomationRuleBuilder";

export const metadata = { title: "Automation Rules — Social Business Studio" };

export default function SocialAutomationPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Automation Rules</h1>
        <p className="mt-1 text-muted-foreground">Set recurring posting rules. Assisted by default; Autopilot is opt-in and pauses on low credits or expired connections.</p>
      </div>
      <SocialAutomationRuleBuilder />
    </div>
  );
}
