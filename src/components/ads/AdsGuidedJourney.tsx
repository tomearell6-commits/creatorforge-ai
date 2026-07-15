"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plug, Megaphone, Palette, Rocket, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { GuidedStepper } from "@/components/studio/GuidedStepper";

type PlatformInfo = { id: string; name: string; configured: boolean; account: { account_name: string | null } | null };

const STEPS = [
  { id: "connect", label: "Connect account", route: "/dashboard/ads/accounts", icon: Plug, blurb: "Link your ad account (optional now — you can export without it)." },
  { id: "create", label: "Create campaign", route: "/dashboard/ads/create", icon: Megaphone, blurb: "Objective, platforms, audience & budget." },
  { id: "creative", label: "Generate creative", route: "/dashboard/ads/creative", icon: Palette, blurb: "AI ad copy + image/video variations." },
  { id: "launch", label: "Launch / Export", route: "/dashboard/ads/launch", icon: Rocket, blurb: "Review, authorize spend, and launch — or export to Ads Manager." },
] as const;

export function AdsGuidedJourney() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<PlatformInfo[] | null>(null);
  const [campaignCount, setCampaignCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/ads/accounts").then((r) => r.json()).then((d) => setPlatforms(d.platforms ?? [])).catch(() => setPlatforms([]));
    fetch("/api/ads/campaigns").then((r) => r.json()).then((d) => setCampaignCount((d.campaigns ?? []).length)).catch(() => setCampaignCount(0));
  }, []);

  if (platforms === null || campaignCount === null) return <Card className="flex items-center justify-center py-10"><Spinner className="h-5 w-5" /></Card>;

  const anyConnected = platforms.some((p) => p.account);
  const doneIds = [anyConnected ? "connect" : "", campaignCount > 0 ? "create" : ""].filter(Boolean);
  const active = STEPS.find((s) => !doneIds.includes(s.id)) ?? STEPS[STEPS.length - 1];

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="text-lg font-semibold">Run your first ad campaign</h2>
        <p className="mt-1 text-sm text-muted-foreground">Build a campaign with AI, then launch it — or export a ready-to-paste brief into each platform&rsquo;s Ads Manager.</p>
      </div>

      <GuidedStepper
        steps={STEPS.map((s) => ({ id: s.id, label: s.label }))}
        activeId={active.id}
        doneIds={doneIds}
        onStep={(id) => { const s = STEPS.find((x) => x.id === id); if (s) router.push(s.route); }}
      />

      <div className="flex flex-col gap-3 rounded-lg border border-brand-500/40 bg-brand-50 p-4 dark:bg-brand-950/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white"><active.icon className="h-4.5 w-4.5" aria-hidden /></span>
          <div>
            <p className="text-sm font-semibold">Next: {active.label}</p>
            <p className="text-xs text-muted-foreground">{active.blurb}</p>
          </div>
        </div>
        <Button onClick={() => router.push(active.route)} className="shrink-0">Continue <ArrowRight className="h-4 w-4" /></Button>
      </div>

      {/* Honest ad-account connection status */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Ad account connections</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
              {p.account ? <Check className="h-3.5 w-3.5 shrink-0 text-green-600" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className={p.account ? "text-green-600" : "text-amber-600"}>{p.account ? "Connected" : "Export only"}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Live auto-publishing per platform activates once its Ads API app is approved and connected. Until then, every platform supports export + Ads-Manager handoff — you can launch today.
        </p>
      </div>
    </Card>
  );
}
