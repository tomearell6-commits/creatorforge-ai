"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, ExternalLink, Plug } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { BrandIcon, hasBrandIcon } from "@/components/icons/BrandIcon";

export type ConnectItem = {
  id: string; label: string; brandIcon: string | null;
  accountType: string; live: boolean; connected: boolean; permissions: string;
};

export type ConnectModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  items: ConnectItem[];
  onConnected?: () => void;
};

const SOCIAL_OAUTH = new Set(["youtube", "youtube_shorts", "tiktok", "instagram", "instagram_reels", "facebook", "facebook_reels", "linkedin", "x", "pinterest"]);

function Icon({ slug, className }: { slug: string | null; className?: string }) {
  if (slug && hasBrandIcon(slug)) return <BrandIcon platform={slug} className={className} />;
  return <Plug className={className} />;
}

/**
 * Shared "Connect an Account" modal — same behaviour in the completion drawer,
 * the Connected Accounts Center, and the Publishing Calendar. Official sign-in
 * only; never asks for social passwords.
 */
export function ConnectAccountModal({ open, onClose, title, subtitle, items, onConnected }: ConnectModalProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const connect = useCallback(async (item: ConnectItem) => {
    setMsg(null);
    if (item.id === "wordpress" || item.id === "woocommerce") { router.push("/dashboard/seo/sites"); return; }
    if (item.accountType === "advertising") { router.push("/dashboard/ads/accounts"); return; }
    if (item.id === "brevo") { router.push("/dashboard/email/settings"); return; }
    if (SOCIAL_OAUTH.has(item.id)) {
      setBusy(item.id);
      try {
        const res = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: item.id }) });
        const j = await res.json().catch(() => ({}));
        if (j.authorizeUrl) { window.location.href = j.authorizeUrl; return; }
        if (!res.ok) { setMsg(j.error || `Couldn't start ${item.label} connection.`); return; }
        onConnected?.();
      } finally { setBusy(null); }
      return;
    }
    setMsg(`${item.label} isn't live for auto-connect yet — you can still prepare an export/draft package for it today.`);
  }, [router, onConnected]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title ?? "Connect an account"}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-background shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{title ?? "Connect an account"}</h2>
            <p className="text-xs text-muted-foreground">{subtitle ?? "Choose where you want to publish or promote. We use official sign-in — never your password."}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
          {msg && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{msg}</p>}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Everything you need is already connected. 🎉</p>}
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Icon slug={item.brandIcon} className="h-6 w-6 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.label}</p>
                <p className="truncate text-xs text-muted-foreground">{item.permissions}</p>
              </div>
              {item.connected ? (
                <span className="inline-flex items-center gap-1 text-xs text-brand-600"><Check className="h-3.5 w-3.5" /> Ready</span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => connect(item)} disabled={busy === item.id}>
                  {busy === item.id ? <Spinner className="h-3.5 w-3.5" /> : <>Connect{(item.id === "wordpress" || item.accountType === "advertising") && <ExternalLink className="ml-1 h-3 w-3" />}</>}
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-2 text-right">
          <Button variant="ghost" size="sm" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}
