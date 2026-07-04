import Link from "next/link";
import { LifeBuoy, FileText, RefreshCcw, Mail } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Billing Support — CreatorsForge AI" };

const FAQ = [
  {
    q: "How do plan purchases work?",
    a: "Plans are one-time crypto purchases: pay once, receive that plan's monthly credits immediately, and your plan stays active for 30 days. Nothing auto-renews — renew whenever you're ready. Card payments via Paddle are coming online shortly.",
  },
  {
    q: "Do purchased top-up credits expire?",
    a: "No. Credits you buy as top-ups never expire — only the monthly plan allowance refreshes each period.",
  },
  {
    q: "Can I get a refund?",
    a: "Unused credit purchases within 14 days are eligible — see the refund policy for the details that apply to crypto payments.",
  },
  {
    q: "Where are my receipts?",
    a: "Every payment gets a numbered invoice under Billing → Invoices, downloadable as PDF.",
  },
  {
    q: "How do I contact sales about Enterprise?",
    a: "Open a support ticket with the subject \"Enterprise\" — include your expected monthly volume and we'll come back with custom pricing.",
  },
];

export default function BillingSupportPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <LifeBuoy className="h-6 w-6 text-brand-600" />
          <CardTitle className="mt-2 text-base">Open a ticket</CardTitle>
          <CardDescription className="mt-1">Billing questions, payment issues, Enterprise sales.</CardDescription>
          <Button asChild className="mt-3"><Link href="/dashboard/support">Contact Support</Link></Button>
        </Card>
        <Card>
          <RefreshCcw className="h-6 w-6 text-brand-600" />
          <CardTitle className="mt-2 text-base">Refund policy</CardTitle>
          <CardDescription className="mt-1">When refunds apply and how they&apos;re processed.</CardDescription>
          <Button asChild variant="outline" className="mt-3"><Link href="/refund-policy" target="_blank">Read Policy</Link></Button>
        </Card>
        <Card>
          <FileText className="h-6 w-6 text-brand-600" />
          <CardTitle className="mt-2 text-base">Terms of Service</CardTitle>
          <CardDescription className="mt-1">The agreement covering plans, credits and payments.</CardDescription>
          <Button asChild variant="outline" className="mt-3"><Link href="/terms" target="_blank">Read Terms</Link></Button>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-brand-600" />
          <CardTitle>Billing FAQ</CardTitle>
        </div>
        <dl className="mt-4 space-y-4">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="text-sm font-semibold">{f.q}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
