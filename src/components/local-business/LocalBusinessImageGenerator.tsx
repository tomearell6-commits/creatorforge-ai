"use client";

import { useState } from "react";
import { ImagePlus, Download, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { LB_IMAGE_TYPES } from "@/config/localBusiness";

export function LocalBusinessImageGenerator() {
  const [type, setType] = useState<string>(LB_IMAGE_TYPES[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true); setMsg(null); setUrl(null);
    const prompt = `Professional ${type.replace(/_/g, " ")} image for a local business. ${details}. Clean, bright, original branded style, no text overlay, no copyrighted logos.`;
    try {
      const res = await fetch("/api/local-business/images/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg("Out of credits — top up in the Credit Wallet."); return; }
      if (!res.ok) { setMsg(j.error || "Image generation failed."); return; }
      setUrl(j.url);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="lb-img-type" className="text-sm font-medium">Image type</label>
            <select id="lb-img-type" value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm capitalize">
              {LB_IMAGE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="lb-img-details" className="text-sm font-medium">Details</label>
            <Input id="lb-img-details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. cozy coffee shop, autumn offer" />
          </div>
        </div>
        <Button className="mt-3" onClick={generate} disabled={busy}>{busy ? <><Spinner className="h-4 w-4" /> Generating…</> : <><ImagePlus className="h-4 w-4" /> Generate image (~5 cr)</>}</Button>
        <p className="mt-2 text-xs text-muted-foreground">Original AI-generated assets only — never copies competitor designs or copyrighted logos.</p>
        {msg && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {url && (
        <Card className="p-5">
          <img src={url} alt={`${type} concept`} className="max-h-96 rounded-lg border border-border" />
          <div className="mt-3 flex gap-2">
            <a href={url} download className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"><Download className="h-3.5 w-3.5" /> Download</a>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />} Copy URL</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
