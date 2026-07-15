"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ListChecks, FileText, Send, Settings, ShieldCheck, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { GuidedStepper } from "@/components/studio/GuidedStepper";

type Journey = {
  providers: { firecrawl: boolean; verify: boolean; brevo: boolean };
  counts: { senderProfile: number; leads: number; verified: number; lists: number; templates: number; campaigns: number };
};

const STEPS = [
  { id: "setup", label: "Set up", route: "/dashboard/leads/settings", icon: Settings, blurb: "Add your sender details & confirm compliance." },
  { id: "find", label: "Find leads", route: "/dashboard/leads/search", icon: Search, blurb: "Search public business contacts by type & location." },
  { id: "verify", label: "Verify emails", route: "/dashboard/leads/verification", icon: ShieldCheck, blurb: "Check emails are real & safe to contact." },
  { id: "list", label: "Build a list", route: "/dashboard/leads/lists", icon: ListChecks, blurb: "Group verified leads into an outreach list." },
  { id: "write", label: "Write outreach", route: "/dashboard/leads/templates", icon: FileText, blurb: "Draft a compliant email template with AI." },
  { id: "send", label: "Send campaign", route: "/dashboard/leads/campaigns", icon: Send, blurb: "Sync to Brevo and send or schedule." },
] as const;

function isDone(id: string, c: Journey["counts"]): boolean {
  switch (id) {
    case "setup": return c.senderProfile > 0;
    case "find": return c.leads > 0;
    case "verify": return c.verified > 0;
    case "list": return c.lists > 0;
    case "write": return c.templates > 0;
    case "send": return c.campaigns > 0;
    default: return false;
  }
}

export function LeadJourney() {
  const router = useRouter();
  const [data, setData] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leads/journey").then((r) => r.json()).then((j) => { if (j.counts) setData(j); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Card className="flex items-center justify-center py-10"><Spinner className="h-5 w-5" /></Card>;
  if (!data) return null;

  const doneIds = STEPS.filter((s) => isDone(s.id, data.counts)).map((s) => s.id);
  const active = STEPS.find((s) => !doneIds.includes(s.id)) ?? STEPS[STEPS.length - 1];
  const providers = [
    { key: "firecrawl", label: "Lead search (Firecrawl)", ready: data.providers.firecrawl },
    { key: "verify", label: "Email verification", ready: data.providers.verify },
    { key: "brevo", label: "Sending (Brevo)", ready: data.providers.brevo },
  ];
  const allReady = providers.every((p) => p.ready);

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="text-lg font-semibold">Your lead-to-outreach journey</h2>
        <p className="mt-1 text-sm text-muted-foreground">Follow the steps in order. Each one unlocks the next — we track your progress automatically.</p>
      </div>

      <GuidedStepper
        steps={STEPS.map((s) => ({ id: s.id, label: s.label }))}
        activeId={active.id}
        doneIds={doneIds}
        onStep={(id) => { const s = STEPS.find((x) => x.id === id); if (s) router.push(s.route); }}
      />

      {/* Current step callout */}
      <div className="flex flex-col gap-3 rounded-lg border border-brand-500/40 bg-brand-50 p-4 dark:bg-brand-950/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <active.icon className="h-4.5 w-4.5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {doneIds.length === STEPS.length ? "All steps complete — run another campaign anytime" : `Next: ${active.label}`}
            </p>
            <p className="text-xs text-muted-foreground">{active.blurb}</p>
          </div>
        </div>
        <Button onClick={() => router.push(active.route)} className="shrink-0">
          {doneIds.length === STEPS.length ? "Open" : "Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Provider readiness — honest about which API keys are live */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Provider status</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {providers.map((p) => (
            <div key={p.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
              {p.ready
                ? <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
                : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
              <span className="min-w-0 flex-1 truncate">{p.label}</span>
              <span className={p.ready ? "text-green-600" : "text-amber-600"}>{p.ready ? "Live" : "Add key"}</span>
            </div>
          ))}
        </div>
        {!allReady && (
          <p className="mt-2 text-xs text-muted-foreground">
            Steps still work in preview/manual mode until each key is added. You can find leads, verify, and send once the keys above are live.
          </p>
        )}
      </div>
    </Card>
  );
}
