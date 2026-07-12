"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plug, Check, ExternalLink, Trash2, Megaphone, Globe, Share2, Mail } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { BrandIcon, hasBrandIcon } from "@/components/icons/BrandIcon";
import type { AccountType } from "@/config/publishingCapabilities";

type UnifiedAccount = {
  id: string; source: string; category: AccountType; platform: string;
  name: string | null; handle: string | null; status: string;
  connectedAt: string | null; expiresAt: string | null;
};
type RegistryItem = { id: string; label: string; brandIcon: string | null; accountType: string; live: boolean; permissions: string };
type Payload = {
  accounts: UnifiedAccount[];
  grouped: Record<AccountType, UnifiedAccount[]>;
  registry: { publish: RegistryItem[]; advertising: RegistryItem[] };
};

const CATEGORY_META: Record<AccountType, { label: string; icon: typeof Share2; blurb: string }> = {
  social: { label: "Social Media", icon: Share2, blurb: "Publish posts, videos, and Reels to your audience." },
  advertising: { label: "Advertising", icon: Megaphone, blurb: "Create ad campaigns to promote your content." },
  website: { label: "Websites & Publishing", icon: Globe, blurb: "Publish articles and pages to your sites." },
  email: { label: "Email Marketing", icon: Mail, blurb: "Send and schedule email campaigns." },
};

const SOCIAL_OAUTH = new Set(["youtube", "youtube_shorts", "tiktok", "instagram", "instagram_reels", "facebook", "facebook_reels", "linkedin", "x", "pinterest"]);

function Icon({ slug, className }: { slug: string | null; className?: string }) {
  if (slug && hasBrandIcon(slug)) return <BrandIcon platform={slug} className={className} />;
  return <Plug className={className} />;
}

export function ConnectedAccountsCenter() {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/integrations/accounts")
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => setMsg("Couldn't load connected accounts."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const connect = useCallback(async (item: RegistryItem) => {
    // Route each platform to its real connect flow.
    if (item.id === "wordpress" || item.id === "woocommerce") { router.push("/dashboard/seo/sites"); return; }
    if (item.accountType === "advertising") { router.push("/dashboard/ads/accounts"); return; }
    if (item.id === "brevo") { router.push("/dashboard/email/settings"); return; }
    if (SOCIAL_OAUTH.has(item.id)) {
      setBusy(item.id); setMsg(null);
      try {
        const res = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: item.id }) });
        const j = await res.json().catch(() => ({}));
        if (j.authorizeUrl) { window.location.href = j.authorizeUrl; return; }
        if (!res.ok) { setMsg(j.error || `Couldn't start ${item.label} connection.`); return; }
        load(); // placeholder-connected in simulate mode
      } finally { setBusy(null); }
      return;
    }
    setMsg(`${item.label} isn't live yet — you'll be able to connect it once its app is enabled. You can still generate export/draft packages for it today.`);
  }, [router, load]);

  const disconnect = useCallback(async (acc: UnifiedAccount) => {
    if (acc.source === "wordpress_sites") { router.push("/dashboard/seo/sites"); return; }
    setBusy(acc.id);
    try {
      await fetch(`/api/social/${acc.id}`, { method: "DELETE" });
      load();
    } finally { setBusy(null); }
  }, [router, load]);

  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading connected accounts…</div>;
  if (!data) return <Card className="p-6 text-sm text-muted-foreground">{msg ?? "No data."}</Card>;

  const cats: AccountType[] = ["social", "advertising", "website", "email"];
  const registryFor = (cat: AccountType): RegistryItem[] =>
    cat === "advertising" ? data.registry.advertising : data.registry.publish.filter((r) => r.accountType === cat);

  return (
    <div className="space-y-6">
      {msg && <Card className="border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{msg}</Card>}

      {cats.map((cat) => {
        const meta = CATEGORY_META[cat];
        const CatIcon = meta.icon;
        const connected = data.grouped[cat] ?? [];
        const options = registryFor(cat);
        const connectedPlatforms = new Set(connected.map((a) => a.platform));
        return (
          <Card key={cat} className="p-5">
            <div className="flex items-center gap-2">
              <CatIcon className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-semibold">{meta.label}</h2>
              <Badge variant="default">{connected.length} connected</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>

            {connected.length > 0 && (
              <div className="mt-3 space-y-2">
                {connected.map((acc) => (
                  <div key={acc.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                    <Icon slug={acc.platform} className="h-5 w-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{acc.name || acc.platform}</p>
                      {acc.handle && <p className="truncate text-xs text-muted-foreground">{acc.handle}</p>}
                    </div>
                    <Badge variant={acc.status === "connected" ? "success" : "warning"}>
                      {acc.status === "connected" ? <><Check className="h-3 w-3" /> connected</> : acc.status}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => disconnect(acc)} disabled={busy === acc.id} aria-label={`Disconnect ${acc.name || acc.platform}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {options.map((item) => {
                const already = connectedPlatforms.has(item.id);
                return (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                    <Icon slug={item.brandIcon} className="h-5 w-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{item.live ? item.permissions : "Connect now · live publishing soon"}</p>
                    </div>
                    {already ? (
                      <Badge variant="success"><Check className="h-3 w-3" /></Badge>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => connect(item)} disabled={busy === item.id}>
                        {busy === item.id ? <Spinner className="h-3.5 w-3.5" /> : <>Connect {item.id === "wordpress" || item.accountType === "advertising" ? <ExternalLink className="ml-1 h-3 w-3" /> : null}</>}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
