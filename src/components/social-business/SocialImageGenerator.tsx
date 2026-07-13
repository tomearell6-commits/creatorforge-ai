"use client";

import { useState } from "react";
import { ImagePlus, Download, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

const FORMATS = [
  { id: "instagram_feed", label: "Instagram feed", w: 1080, h: 1080 },
  { id: "instagram_story", label: "Instagram story", w: 1080, h: 1920 },
  { id: "facebook", label: "Facebook post", w: 1200, h: 630 },
  { id: "linkedin", label: "LinkedIn graphic", w: 1200, h: 627 },
  { id: "pinterest", label: "Pinterest pin", w: 1000, h: 1500 },
  { id: "youtube_thumb", label: "YouTube thumbnail", w: 1280, h: 720 },
];

export function SocialImageGenerator() {
  const [fmt, setFmt] = useState(FORMATS[0].id);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    const f = FORMATS.find((x) => x.id === fmt)!;
    setBusy(true); setMsg(null); setUrl(null);
    const prompt = `Original branded ${f.label} for a business. ${details}. Clean, on-brand, no text overlay, no copyrighted logos.`;
    try {
      const res = await fetch("/api/social-business/images/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, width: f.w, height: f.h }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg("Out of credits — top up in the Credit Wallet."); return; }
      if (!res.ok) { setMsg(j.error || "Failed."); return; }
      setUrl(j.url);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="si-fmt" className="text-sm font-medium">Format</label>
            <select id="si-fmt" value={fmt} onChange={(e) => setFmt(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label} ({f.w}×{f.h})</option>)}</select>
          </div>
          <div><label htmlFor="si-details" className="text-sm font-medium">Details</label><Input id="si-details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. autumn sale, cozy tones" /></div>
        </div>
        <Button className="mt-3" onClick={generate} disabled={busy}>{busy ? <><Spinner className="h-4 w-4" /> Generating…</> : <><ImagePlus className="h-4 w-4" /> Generate (~5 cr)</>}</Button>
        <p className="mt-1 text-xs text-muted-foreground">Original AI assets only — never copies competitor designs or copyrighted logos.</p>
        {msg && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{msg}</p>}
      </Card>
      {url && (
        <Card className="p-5">
          <img src={url} alt="Generated social graphic" className="max-h-96 rounded-lg border border-border" />
          <div className="mt-3 flex gap-2">
            <a href={url} download className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"><Download className="h-3.5 w-3.5" /> Download</a>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />} Copy URL</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
