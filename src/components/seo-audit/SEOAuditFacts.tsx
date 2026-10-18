"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { FACT_FIELDS, cleanFacts, countFacts, type BusinessFacts, type FactKey } from "@/lib/seo-audit/facts";

/**
 * "Your business details": the real facts the owner types once, so the pages Forge writes are finished
 * instead of full of [Fill in] markers. Saved per website and reused by every audit of it.
 */
export function SEOAuditFacts({ host, saved, defaults, onSaved }: { host: string; saved: BusinessFacts; defaults: BusinessFacts; onSaved: (f: BusinessFacts) => void }) {
  const hasSaved = countFacts(saved) > 0;
  const [open, setOpen] = useState(!hasSaved);
  const [values, setValues] = useState<BusinessFacts>({ ...defaults, ...saved });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const filled = countFacts(values);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/seo-audit/facts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host, facts: cleanFacts(values) }) });
      const j = (await res.json().catch(() => ({}))) as { facts?: BusinessFacts; error?: string };
      if (!res.ok) { setMsg({ kind: "error", text: j.error ?? "Could not save your details." }); return; }
      onSaved(j.facts ?? {});
      setMsg({ kind: "success", text: "Saved. Pages you create now use these details." });
    } catch { setMsg({ kind: "error", text: "Network error. Please try again." }); }
    finally { setBusy(false); }
  }

  const set = (k: FactKey, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const cls = "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>
          <span className="block text-sm font-semibold">Your business details {hasSaved ? <span className="ml-1 text-xs font-normal text-green-600">● {countFacts(saved)} saved</span> : <span className="ml-1 text-xs font-normal text-amber-600">add these first</span>}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">Tell us once and every page comes out finished, with your real email, payment methods and refund terms instead of “[Fill in]” markers. Everything is optional; leave out anything that doesn’t apply.</span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-brand-600">{open ? "Hide" : "Edit"}</span>
      </button>

      {open && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {FACT_FIELDS.map((f) => (
              <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
                <label htmlFor={`fact-${f.key}`} className="text-xs font-medium">{f.label} <span className="font-normal text-muted-foreground">· used by {f.usedBy}</span></label>
                {f.long
                  ? <textarea id={`fact-${f.key}`} rows={2} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.hint} className={cls} />
                  : <input id={`fact-${f.key}`} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.hint} className={`${cls} h-10`} />}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" disabled={busy} onClick={save}>{busy ? <><Spinner size="sm" /> Saving…</> : `Save details (${filled} filled)`}</Button>
            <span className="text-xs text-muted-foreground">Only what you type here is used. Nothing is invented for you.</span>
          </div>
          {msg && <Alert variant={msg.kind === "success" ? "success" : "error"}>{msg.text}</Alert>}
        </>
      )}
    </div>
  );
}
