import { EmailConnect } from "@/components/email/EmailConnect";

export const metadata = { title: "Connect Email — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Connect Email</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connect via official OAuth — CreatorsForge never sees your password.</p>
      </div>
      <EmailConnect />
    </div>
  );
}
