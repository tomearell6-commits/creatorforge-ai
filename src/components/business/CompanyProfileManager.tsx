"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

type Profile = Record<string, unknown> & { optimization_json?: Optimization | null };
type Scoring = { score: number; completeness: number; issues: { field: string; label: string; advice: string }[] };
type Optimization = { summary: string; seoKeywords: string[]; improvedDescription: string; recommendations: { area: string; advice: string }[] };

const FIELDS: { key: string; label: string; long?: boolean; placeholder?: string }[] = [
  { key: "company_name", label: "Company name" },
  { key: "industry", label: "Industry" },
  { key: "description", label: "Business description", long: true, placeholder: "What you do, who you serve, why customers choose you (2–4 sentences)" },
  { key: "products_summary", label: "Products", long: true },
  { key: "services_summary", label: "Services", long: true },
  { key: "target_market", label: "Target market", long: true },
  { key: "website", label: "Website" },
  { key: "contact_email", label: "Contact email" },
  { key: "contact_phone", label: "Contact phone" },
  { key: "address", label: "Address" },
  { key: "business_hours", label: "Business hours", placeholder: "Mon–Fri 9–5" },
  { key: "logo_url", label: "Logo URL" },
  { key: "brand_voice", label: "Brand voice", placeholder: "e.g. friendly expert, premium & minimal" },
  { key: "mission", label: "Mission statement", long: true },
  { key: "story", label: "Company story", long: true },
];

export function CompanyProfileManager() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scoring, setScoring] = useState<Scoring | null>(null);
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/business/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setProfile(d?.profile ?? {});
        setScoring(d?.scoring ?? null);
        setOptimization(d?.profile?.optimization_json ?? null);
      })
      .catch(() => setError("Could not load your profile."));
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/business/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(d.error ?? "Save failed."); return; }
    setScoring(d.scoring);
    setMessage("Profile saved.");
  }

  async function optimize() {
    setOptimizing(true);
    setError(null);
    const res = await fetch("/api/business/profile/optimize", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setOptimizing(false);
    if (!res.ok) { setError(d.error ?? "Optimization failed."); return; }
    setOptimization(d.optimization);
    setScoring((prev) => (d.scoring ? { ...d.scoring, issues: d.scoring.issues } : prev));
  }

  if (!profile) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {message && <Alert variant="success" title={message} />}
        {error && <Alert variant="error" title={error} />}
        <Card>
          <CardTitle>Company Profile</CardTitle>
          <CardDescription className="mt-1">
            This profile powers every AI reply, document, campaign and report — the better it is, the better they get.
          </CardDescription>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
                <Label htmlFor={`cp-${f.key}`}>{f.label}</Label>
                {f.long ? (
                  <textarea
                    id={`cp-${f.key}`}
                    value={String(profile[f.key] ?? "")}
                    onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                ) : (
                  <Input
                    id={`cp-${f.key}`}
                    value={String(profile[f.key] ?? "")}
                    onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
            <Button variant="outline" onClick={optimize} disabled={optimizing}>
              <Sparkles className="h-4 w-4" /> {optimizing ? "Analyzing…" : "AI Optimize (5 credits)"}
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {scoring && (
          <Card>
            <div className="flex items-center justify-between">
              <CardTitle>Optimization Score</CardTitle>
              <span className={`text-3xl font-extrabold ${scoring.score >= 80 ? "text-brand-600" : scoring.score >= 50 ? "text-amber-500" : "text-red-500"}`}>
                {scoring.score}
              </span>
            </div>
            <CardDescription className="mt-1">{scoring.completeness}% of fields completed</CardDescription>
            {scoring.issues.length > 0 && (
              <ul className="mt-3 space-y-2">
                {scoring.issues.slice(0, 6).map((i) => (
                  <li key={i.field} className="text-xs">
                    <span className="font-semibold">{i.label}:</span>{" "}
                    <span className="text-muted-foreground">{i.advice}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {optimization && (
          <Card>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600" />
              <CardTitle className="text-base">AI Analysis</CardTitle>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{optimization.summary}</p>
            {optimization.seoKeywords?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {optimization.seoKeywords.map((k) => <Badge key={k} variant="outline">{k}</Badge>)}
              </div>
            )}
            {optimization.improvedDescription && (
              <div className="mt-3 rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-semibold">Suggested description</p>
                <p className="mt-1 text-xs text-muted-foreground">{optimization.improvedDescription}</p>
                <Button
                  size="sm" variant="ghost" className="mt-2"
                  onClick={() => setProfile({ ...profile, description: optimization.improvedDescription })}
                >
                  Use this
                </Button>
              </div>
            )}
            {optimization.recommendations?.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {optimization.recommendations.map((r) => (
                  <li key={r.area} className="text-xs">
                    <span className="font-semibold">{r.area}:</span>{" "}
                    <span className="text-muted-foreground">{r.advice}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
