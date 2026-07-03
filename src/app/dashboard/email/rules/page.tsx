import { EmailAutomationRuleBuilder } from "@/components/email/EmailPanels";

export const metadata = { title: "Automation Rules — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Automation Rules</h1>
        <p className="mt-1 text-sm text-muted-foreground">Safe automations: draft, alert, label, follow-up — never auto-send.</p>
      </div>
      <EmailAutomationRuleBuilder />
    </div>
  );
}
