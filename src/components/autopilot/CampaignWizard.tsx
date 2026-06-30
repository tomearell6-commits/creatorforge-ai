"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { AUTOPILOT_GOALS, AUTOPILOT_CONTENT_TYPES, AUTOPILOT_FREQUENCIES, AUTOPILOT_CHANNELS, AUTOPILOT_MODES } from "@/lib/constants";

const STEPS = ["Business", "Goals", "Content", "Frequency", "Times", "Destinations", "Mode"];

function toggle(arr: string[], v: string) { return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]; }

export function CampaignWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    name: "", industry: "", country: "", language: "en", website: "", brand_description: "",
    goals: [] as string[], content_types: [] as string[], frequency: "weekly",
    publish_windows: ["09:00"] as string[], timezone: "UTC", destinations: [] as string[], mode: "manual",
  });

  function next() {
    if (step === 2 && f.content_types.length === 0) { setErr("Pick at least one content type."); return; }
    if (step === 5 && f.destinations.length === 0) { setErr("Pick at least one destination."); return; }
    setErr(null); setStep(step + 1);
  }

  async function submit() {
    if (!f.name.trim()) { setStep(0); setErr("Enter a business/campaign name."); return; }
    setBusy(true); setErr(null);
    const r = await fetch("/api/autopilot/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(d.error || "Could not create campaign."); return; }
    router.push("/dashboard/autopilot/campaigns");
  }

  return (
    <Card className="space-y-5">
      {/* Step indicator */}
      <div className="flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => (
          <span key={s} className={`rounded-full px-2.5 py-1 text-xs ${i === step ? "bg-brand-600 text-white" : i < step ? "bg-brand-100 text-brand-700" : "bg-muted text-muted-foreground"}`}>{i + 1}. {s}</span>
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="apcw-business-campaign-name">Business / campaign name</Label><Input id="apcw-business-campaign-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Acme Pet Supplies" /></div>
          <div><Label htmlFor="apcw-industry">Industry</Label><Input id="apcw-industry" value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} placeholder="Ecommerce / Pets" /></div>
          <div><Label htmlFor="apcw-country">Country</Label><Input id="apcw-country" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} placeholder="United States" /></div>
          <div><Label htmlFor="apcw-language">Language</Label><Input id="apcw-language" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} placeholder="en" /></div>
          <div><Label htmlFor="apcw-website">Website</Label><Input id="apcw-website" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://example.com" /></div>
          <div className="sm:col-span-2"><Label htmlFor="apcw-brand-description">Brand description</Label><Textarea id="apcw-brand-description" rows={3} value={f.brand_description} onChange={(e) => setF({ ...f, brand_description: e.target.value })} placeholder="What you sell, your tone, your audience…" /></div>
        </div>
      )}

      {step === 1 && <Chips title="What are your goals?" options={AUTOPILOT_GOALS.map((g) => ({ id: g.id, label: g.label }))} selected={f.goals} onToggle={(id) => setF({ ...f, goals: toggle(f.goals, id) })} />}
      {step === 2 && <Chips title="What content should Autopilot create?" options={AUTOPILOT_CONTENT_TYPES.map((c) => ({ id: c.id, label: `${c.label} (~${c.credits} cr)` }))} selected={f.content_types} onToggle={(id) => setF({ ...f, content_types: toggle(f.content_types, id) })} />}

      {step === 3 && (
        <div>
          <Label>Posting frequency</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {AUTOPILOT_FREQUENCIES.map((fr) => (
              <button key={fr.id} type="button" onClick={() => setF({ ...f, frequency: fr.id })} className={`rounded-lg border p-3 text-left text-sm ${f.frequency === fr.id ? "border-brand-500 bg-brand-50" : "border-border hover:bg-muted"}`}>{fr.label}</button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div><Label htmlFor="apcw-publishing-windows">Publishing windows (24h, comma-separated)</Label><Input id="apcw-publishing-windows" value={f.publish_windows.join(", ")} onChange={(e) => setF({ ...f, publish_windows: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} placeholder="09:00, 18:00" /></div>
          <div><Label htmlFor="apcw-time-zone">Time zone</Label><Input id="apcw-time-zone" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} placeholder="UTC" /></div>
          <p className="text-xs text-muted-foreground">Scheduling is stored in UTC for reliability; display localizes to your zone.</p>
        </div>
      )}

      {step === 5 && (
        <div>
          <Chips title="Where should content be published?" options={AUTOPILOT_CHANNELS.map((c) => ({ id: c.id, label: c.label }))} selected={f.destinations} onToggle={(id) => setF({ ...f, destinations: toggle(f.destinations, id) })} />
          <p className="mt-2 text-xs text-muted-foreground">Connect accounts under Social Accounts / WordPress Sites. Autopilot only publishes to connected destinations.</p>
        </div>
      )}

      {step === 6 && (
        <div>
          <Label>Approval mode</Label>
          <div className="grid gap-2">
            {AUTOPILOT_MODES.map((m) => (
              <button key={m.id} type="button" onClick={() => setF({ ...f, mode: m.id })} className={`rounded-lg border p-3 text-left ${f.mode === m.id ? "border-brand-500 bg-brand-50" : "border-border hover:bg-muted"}`}>
                <span className="font-medium">{m.name}</span><p className="text-xs text-muted-foreground">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex items-center justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        {step < STEPS.length - 1
          ? <Button onClick={next}>Next</Button>
          : <Button variant="accent" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create campaign"}</Button>}
      </div>
    </Card>
  );
}

function Chips({ title, options, selected, onToggle }: { title: string; options: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <Label>{title}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.id} type="button" onClick={() => onToggle(o.id)} className={`rounded-full border px-3 py-1.5 text-sm ${selected.includes(o.id) ? "border-brand-500 bg-brand-50 font-medium text-brand-800" : "border-border hover:bg-muted"}`}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
