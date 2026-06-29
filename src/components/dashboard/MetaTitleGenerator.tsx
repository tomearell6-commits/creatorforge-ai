"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

export function MetaTitleGenerator() {
  const [topic, setTopic] = useState("");
  const [options, setOptions] = useState<{ title: string; description: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  async function go() {
    if (!topic.trim()) { setMsg("Enter a keyword or topic."); return; }
    setBusy(true); setMsg(null);
    const res = await fetch("/api/tools/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "meta-titles", topic }) });
    const j = await res.json();
    if (!res.ok) setMsg(j.error || "Failed.");
    else { setOptions(j.output.options); setMsg(j.usedAI ? null : "Generated (placeholder — set ANTHROPIC_API_KEY for AI)."); }
    setBusy(false);
  }
  function copy(i: number, text: string) { navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(null), 1500); }

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <div><Label>Keyword / topic</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. best dog food for puppies" onKeyDown={(e) => e.key === "Enter" && go()} /></div>
        <Button disabled={busy} onClick={go}>{busy ? "Generating…" : "Generate SEO titles"}</Button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {options && (
        <div className="space-y-3">
          {options.map((o, i) => (
            <Card key={i} className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{o.title} <span className="text-xs text-muted-foreground">({o.title.length} chars)</span></p>
                  <p className="text-sm text-muted-foreground">{o.description} <span className="text-xs">({o.description.length})</span></p>
                </div>
                <button className="shrink-0 text-xs text-brand-700 hover:underline" onClick={() => copy(i, `${o.title}\n${o.description}`)}>{copied === i ? "Copied!" : "Copy"}</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
