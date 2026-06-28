import { SupportCenter } from "@/components/dashboard/SupportCenter";
export const metadata = { title: "Support" };
export default function SupportPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="mt-1 text-muted-foreground">Submit a ticket and track replies from our team.</p>
      </div>
      <SupportCenter />
    </div>
  );
}
