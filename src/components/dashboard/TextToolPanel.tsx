"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

/** Generic panel for list-style AI text tools ({items: string[]}). */
export function TextToolPanel({
  tool,
  inputLabel,
  placeholder,
  buttonLabel,
}: {
  tool: string;
  inputLabel: string;
  placeholder: string;
  buttonLabel: string;
}) {
  const [topic, setTopic] = useState("");
  const [items, setItems] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  async function go() {
    if (!topic.trim()) { setErr("Enter a topic."); setMsg(null); return; }
    setBusy(true); setMsg(null); setErr(null);
    const res = await fetch("/api/tools/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool, topic }) });
    const j = await res.json();
    if (!res.ok) setErr(j.error || "Failed.");
    else { setItems(j.output.items ?? []); setMsg(j.usedAI ? null : "Generated (placeholder — set ANTHROPIC_API_KEY for AI)."); }
    setBusy(false);
  }
  function copy(i: number, text: string) { navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(null), 1500); }

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <div><Label htmlFor="ttp-input">{inputLabel}</Label><Input id="ttp-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && go()} /></div>
        <Button disabled={busy} onClick={go}>{busy ? "Generating…" : buttonLabel}</Button>
        {err && <Alert variant="error">{err}</Alert>}
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {items && (
        <div className="space-y-2">
          {items.map((it, i) => (
            <Card key={i} className="flex items-start justify-between gap-3 p-3">
              <p className="whitespace-pre-wrap text-sm">{it}</p>
              <button className="shrink-0 text-xs text-brand-700 hover:underline" onClick={() => copy(i, it)}>{copied === i ? "Copied!" : "Copy"}</button>
            </Card>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No results.</p>}
        </div>
      )}
    </div>
  );
}
