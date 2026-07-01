import { Alert } from "@/components/ui/Alert";

/**
 * Reusable compliance reminder shown across the Lead Generator.
 * Reinforces the guardrails that keep outreach lawful and permission-based.
 */
export function ComplianceWarningBox({ className }: { className?: string }) {
  return (
    <Alert variant="info" title="Responsible outreach" className={className}>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        <li>Only public business contact data is collected — no scraping of private or personal information.</li>
        <li>Every email includes an unsubscribe footer, appended automatically to every send.</li>
        <li>Review your leads before any outreach — you are responsible for who you contact.</li>
        <li>Suppressed, do-not-contact, and unsubscribed leads are never contacted.</li>
      </ul>
    </Alert>
  );
}
