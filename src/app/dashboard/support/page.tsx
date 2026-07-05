import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { SupportCenter } from "@/components/dashboard/SupportCenter";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="mt-1 text-muted-foreground">Submit a ticket and track replies from our team.</p>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Prefer to watch instead?</CardTitle>
          <CardDescription className="mt-1">
            Short walkthrough videos cover every feature — most questions are answered in under a minute.
          </CardDescription>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/tutorials"><PlayCircle className="h-4 w-4" /> Watch Demo &amp; Tutorials</Link>
        </Button>
      </Card>

      <SupportCenter />
    </div>
  );
}
