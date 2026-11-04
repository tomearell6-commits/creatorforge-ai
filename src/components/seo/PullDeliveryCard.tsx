"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "./AutopilotSiteCard";

type Status = { delivery: "push" | "pull"; connected: boolean; lastPullAt: string | null; waiting: number; siteName: string | null };
type Enabled = { token: string; siteId: string; serverUrl: string };

function Copy({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 break-all rounded bg-muted px-2 py-1">{value}</code>
      <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? "Copied" : "Copy"}</Button>
    </div>
  );
}

/**
 * For websites whose host blocks CreatorsForge from sending posts in (captcha or firewall): switch to "pull" delivery.
 * A small plugin on the website then collects each finished article itself, so nothing has to get through the firewall.
 */
export function PullDeliveryCard({ wordpressSiteId, blocked }: { wordpressSiteId: string; blocked: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(blocked);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Enabled | null>(null);

  const load = useCallback(async () => {
    try { setStatus(await api<Status>(`/api/wordpress/sites/${wordpressSiteId}/pull`)); } catch { /* shown as unavailable */ }
  }, [wordpressSiteId]);
  useEffect(() => { void load(); }, [load]);
  // While waiting for the plugin to connect, look again every few seconds.
  useEffect(() => {
    if (!status || status.delivery !== "pull" || status.connected) return;
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [status, load]);

  async function enable() {
    setBusy(true); setErr(null);
    try { setFresh(await api<Enabled>(`/api/wordpress/sites/${wordpressSiteId}/pull`, { method: "POST" })); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not switch on."); }
    finally { setBusy(false); }
  }
  async function disable() {
    if (!confirm("Go back to sending articles directly? The plugin's secret stops working.")) return;
    setBusy(true); setErr(null);
    try { await api(`/api/wordpress/sites/${wordpressSiteId}/pull`, { method: "DELETE" }); setFresh(null); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not switch back."); }
    finally { setBusy(false); }
  }

  if (!status) return null;
  const on = status.delivery === "pull";

  return (
    <div className="rounded-lg border border-border p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">Pull delivery {on && <span className="ml-1 text-xs font-normal text-green-600">● on</span>}</p>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            {on
              ? "Your website collects each finished article itself with a small plugin, so your host's firewall or captcha can't block it."
              : blocked
                ? "Your host is blocking CreatorsForge from sending posts in. Switch to pull delivery: a small plugin on your website collects the articles instead."
                : "Only needed if your host blocks CreatorsForge from sending posts in (a captcha or firewall page). Most websites don't need it."}
          </p>
        </div>
        {!open && <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{on ? "Show details" : "Set up"}</Button>}
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          {err && <Alert variant="error">{err}</Alert>}

          {!on && (
            <>
              <p className="text-xs text-muted-foreground">This creates a secret that only the plugin on your website knows. You will install the plugin, paste three values, and Autopilot carries on as normal. Credits are taken once the article exists on your website.</p>
              <Button size="sm" disabled={busy} onClick={enable}>{busy ? <><Spinner size="sm" /> Working…</> : "Switch on pull delivery"}</Button>
            </>
          )}

          {on && (
            <>
              <p className={`text-xs ${status.connected ? "text-green-600" : "text-amber-600"}`}>
                {status.connected ? "● The plugin on your website is connected" : "○ Waiting for the plugin to connect (this updates by itself)"}
                {status.lastPullAt ? ` · last contact ${new Date(status.lastPullAt).toLocaleString()}` : ""}
                {status.waiting > 0 ? ` · ${status.waiting} article${status.waiting === 1 ? "" : "s"} waiting to be collected` : ""}
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                <li><a className="font-semibold text-brand-600 underline" href="/downloads/creatorsforge-pull.zip">Download the plugin</a> (a small ZIP file).</li>
                <li>In WordPress open <strong>Plugins, Add New Plugin, Upload Plugin</strong>, choose the ZIP, then <strong>Install</strong> and <strong>Activate</strong>.</li>
                <li>Open <strong>Settings, CreatorsForge Pull</strong>, paste the values below, and press <strong>Save and check connection</strong>.</li>
              </ol>
              {fresh ? (
                <div className="space-y-1.5 rounded-md bg-muted/40 p-3">
                  <Copy label="Address" value={fresh.serverUrl} />
                  <Copy label="Site ID" value={fresh.siteId} />
                  <Copy label="Secret" value={fresh.token} />
                  <p className="pt-1 text-xs text-amber-700">Copy the secret now. For your security it is shown only once. If you lose it, press “Make a new secret”.</p>
                </div>
              ) : (
                <div className="space-y-1.5 rounded-md bg-muted/40 p-3 text-xs">
                  <Copy label="Address" value={(typeof window !== "undefined" ? window.location.origin : "https://www.creatorsforge.io")} />
                  <Copy label="Site ID" value={wordpressSiteId} />
                  <p className="text-muted-foreground">The secret was shown when you switched this on. Lost it? Make a new one (the old one stops working).</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={enable}>Make a new secret</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={disable}>Go back to direct delivery</Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Hide</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
