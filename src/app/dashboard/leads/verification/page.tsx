import { EmailVerificationPanel } from "@/components/leads/EmailVerificationPanel";

export const metadata = { title: "Email Verification — CreatorForge AI" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Verification</h1>
        <p className="mt-1 text-muted-foreground">Check deliverability before outreach to protect your sender reputation.</p>
      </div>
      <EmailVerificationPanel />
    </div>
  );
}
