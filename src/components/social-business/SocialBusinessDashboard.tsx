"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Share2, Check, ArrowRight, Plug } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { BrandIcon, hasBrandIcon } from "@/components/icons/BrandIcon";
import { PlatformCapabilityBadge } from "./PlatformCapabilityBadge";
import type { CapabilityLevel } from "@/config/socialProviderCapabilities";

type Provider = {
  id: string; name: string; brandIcon: string | null; connected: boolean; live: boolean;
  publishing: CapabilityLevel; analytics: CapabilityLevel; content: CapabilityLevel; knownLimits: string;
};
type Account = { id: string; provider: string; account_name: string | null; status: string };

const SECTIONS = [
  { id: "accounts", label: "Connected Accounts" }, { id: "profile-optimization", label: "Profile Optimization" },
  { id: "content", label: "Content Generator" }, { id: "images", label: "AI Image Studio" },
  { id: "videos", label: "AI Video Studio" }, { id: "campaigns", label: "Campaign Builder" },
  { id: "calendar", label: "Publishing Calendar" }, { id: "publishing", label: "Publishing Queue" },
  { id: "inbox", label: "Inbox & Enquiries" }, { id: "replies", label: "AI Reply Assistant" },
  { id: "analytics", label: "Analytics" }, { id: "reports", label: "Reports" },
  { id: "automation", label: "Automation Rules" }, { id: "settings", label: "Settings" },
];
const BUILT = new Set(["accounts", "settings"]);
const SOCIAL_OAUTH = new Set(["youtube", "youtube_shorts", "tiktok", "instagram", "facebook", "linkedin", "x", "pinterest"]);

function Icon({ slug, className }: { slug: string | null; className?: string }) {
  if (slug && hasBrandIcon(slug)) return <BrandIcon platform={slug} className={className} />;
  return <Plug className={className} />;
}

export function SocialBusinessDashboard() {
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/social-business/capabilities").then((r) => r.json()).then((j) => { setProviders(j.providers ?? []); setAccounts(j.accounts ?? []); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const connect = useCallback(async (p: Provider) => {
    if (p.id === "wordpress") { router.push("/dashboard/seo/sites"); return; }
    if (p.id === "google_business") { router.push("/dashboard/grow/local-business/settings"); return; }
    if (p.id === "brevo") { router.push("/dashboard/email/settings"); return; }
    if (SOCIAL_OAUTH.has(p.id)) {
      setBusy(p.id); setMsg(null);
      try {
        const res = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: p.id }) });
        const j = await res.json().catch(() => ({}));
        if (j.authorizeUrl) { window.location.href = j.authorizeUrl; return; }
        if (!res.ok) { setMsg(j.error || `Couldn't start ${p.name}.`); return; }
        load();
      } finally { setBusy(null); }
      return;
    }
    setMsg(`${p.name} isn't live for auto-connect yet — content and export packages work today.`);
  }, [router, load]);

  const activePlatforms = new Set(accounts.filter((a) => a.status === "connected").map((a) => a.provider)).size;

  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>;

  return (
    <div className="space-y-6">
      {msg && <Card className="border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{msg}</Card>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Connected accounts", value: accounts.length },
          { label: "Active platforms", value: activePlatforms },
          { label: "Supported platforms", value: providers.length },
          { label: "Live publishing now", value: providers.filter((p) => p.live).length },
        ].map((s) => (
          <Card key={s.label} className="p-4"><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2"><Share2 className="h-5 w-5 text-brand-600" /><h2 className="text-base font-semibold">Platforms</h2></div>
        <p className="mt-1 text-sm text-muted-foreground">Official sign-in only — never your password. Each platform shows what its API supports today.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {providers.map((p) => (
            <div key={p.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Icon slug={p.brandIcon} className="h-5 w-5" />
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                {p.connected ? <Badge variant="success"><Check className="h-3 w-3" /> connected</Badge>
                  : <Button variant="outline" size="sm" onClick={() => connect(p)} disabled={busy === p.id}>{busy === p.id ? <Spinner className="h-3.5 w-3.5" /> : "Connect"}</Button>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <PlatformCapabilityBadge level={p.publishing} label="Publish" />
                <PlatformCapabilityBadge level={p.analytics} label="Analytics" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground">Studio sections</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SECTIONS.map((s) => {
            const built = BUILT.has(s.id);
            const inner = (
              <Card className={`flex h-full items-center gap-2 p-3 ${built ? "hover:border-brand-500/50" : "opacity-60"}`}>
                <span className="flex-1 text-sm font-medium">{s.label}</span>
                {built ? <ArrowRight className="h-4 w-4 text-brand-600" /> : <Badge variant="default">soon</Badge>}
              </Card>
            );
            return built ? <Link key={s.id} href={`/dashboard/grow/social-business/${s.id}`}>{inner}</Link> : <div key={s.id}>{inner}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
