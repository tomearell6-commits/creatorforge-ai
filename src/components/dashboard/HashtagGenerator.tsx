"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

const sel = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";
const PLATFORMS = ["Instagram", "TikTok", "YouTube", "X", "LinkedIn", "Facebook", "Pinterest"];

export function HashtagGenerator() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [sets, setSets] = useState<{ label: string; tags: string[] }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function go() {
    if (!topic.trim()) { setMsg("Enter a topic."); return; }
    setBusy(true); setMsg(null);
    const res = await fetch("/api/tools/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "hashtags", topic, platform }) });
    const j = await res.json();
    if (!res.ok) setMsg(j.error || "Failed.");
    else { setSets(j.output.sets); setMsg(j.usedAI ? null : "Generated (placeholder — set ANTHROPIC_API_KEY for AI)."); }
    setBusy(false);
  }
  function copy(label: string, tags: string[]) {
    navigator.clipboard.writeText(tags.join(" "));
    setCopied(label); setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2"><Label>Topic / keyword</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. puppy training tips" onKeyDown={(e) => e.key === "Enter" && go()} /></div>
          <div><Label>Platform</Label><select className={sel} value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
        </div>
        <Button disabled={busy} onClick={go}>{busy ? "Generating…" : "Generate hashtags"}</Button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {sets && (
        <div className="grid gap-4 md:grid-cols-3">
          {sets.map((s) => (
            <Card key={s.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{s.label}</h3>
                <button className="text-xs text-brand-700 hover:underline" onClick={() => copy(s.label, s.tags)}>{copied === s.label ? "Copied!" : "Copy all"}</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.tags.map((t) => <span key={t} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
