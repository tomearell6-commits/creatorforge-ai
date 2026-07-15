"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { ComplianceWarningBox } from "./ComplianceWarningBox";
import {
  LEAD_BUSINESS_TYPES,
  LEAD_CREDIT_COSTS,
  MAX_LEADS_PER_CAMPAIGN,
  MAX_SOURCE_URLS,
} from "@/lib/leads/constants";

type RunResult = {
  leadsFound: number;
  verified: number;
  creditsUsed: number;
  toppedOut: boolean;
  message?: string;
};

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-brand-600" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export function LeadCampaignForm() {
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<string>(LEAD_BUSINESS_TYPES[0]);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [keywords, setKeywords] = useState("");
  const [sourceUrlsText, setSourceUrlsText] = useState("");
  const [maxLeads, setMaxLeads] = useState(50);
  const [requireEmail, setRequireEmail] = useState(true);
  const [verifyEmails, setVerifyEmails] = useState(true);
  const [syncToBrevo, setSyncToBrevo] = useState(false);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const sourceUrls = useMemo(
    () =>
      sourceUrlsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [sourceUrlsText]
  );

  const keywordList = useMemo(
    () =>
      keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    [keywords]
  );

  const tooManyUrls = sourceUrls.length > MAX_SOURCE_URLS;
  const boundedMax = Math.min(Math.max(maxLeads || 0, 0), MAX_LEADS_PER_CAMPAIGN);

  // Estimate: page scan per source URL + email verify per targeted lead (when enabled).
  const estCredits = useMemo(() => {
    const scan = sourceUrls.length * LEAD_CREDIT_COSTS.pageScan;
    const verify = verifyEmails ? boundedMax * LEAD_CREDIT_COSTS.emailVerify : 0;
    return scan + verify + LEAD_CREDIT_COSTS.campaignCreate;
  }, [sourceUrls.length, verifyEmails, boundedMax]);

  const canSubmit = name.trim().length > 0 && !tooManyUrls && !running;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const createRes = await fetch("/api/leads/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          business_type: businessType,
          country: country.trim(),
          city: city.trim(),
          keywords: keywordList,
          source_urls: sourceUrls,
          max_leads: boundedMax,
          require_email: requireEmail,
          verify_emails: verifyEmails,
          sync_to_brevo: syncToBrevo,
        }),
      });
      if (!createRes.ok) throw new Error((await createRes.json().catch(() => ({})))?.error || "Could not create campaign.");
      const { campaign } = await createRes.json();

      const runRes = await fetch("/api/leads/campaigns/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      if (!runRes.ok) throw new Error((await runRes.json().catch(() => ({})))?.error || "Campaign run failed.");
      setResult((await runRes.json()) as RunResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ComplianceWarningBox />

      <Card className="space-y-4">
        <div>
          <CardTitle>Search details</CardTitle>
          <CardDescription>Tell us who you want to reach and where to look.</CardDescription>
        </div>

        <div>
          <Label htmlFor="lead-name">Campaign name</Label>
          <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pet shops — Sydney Q3" required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="lead-type">Business type</Label>
            <select
              id="lead-type"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {LEAD_BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="lead-max">Maximum leads</Label>
            <Input
              id="lead-max"
              type="number"
              min={1}
              max={MAX_LEADS_PER_CAMPAIGN}
              value={maxLeads}
              onChange={(e) => setMaxLeads(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Up to {MAX_LEADS_PER_CAMPAIGN} per campaign.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="lead-country">Target country</Label>
            <Input id="lead-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Australia" />
          </div>
          <div>
            <Label htmlFor="lead-city">Target city / region</Label>
            <Input id="lead-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sydney, NSW" />
          </div>
        </div>

        <div>
          <Label htmlFor="lead-keywords">Keywords</Label>
          <Input id="lead-keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="dog food, grooming, pet supplies" />
          <p className="mt-1 text-xs text-muted-foreground">Comma-separated. {keywordList.length} keyword{keywordList.length === 1 ? "" : "s"}.</p>
        </div>

        <div>
          <Label htmlFor="lead-urls">Source URLs</Label>
          <Textarea
            id="lead-urls"
            rows={4}
            value={sourceUrlsText}
            onChange={(e) => setSourceUrlsText(e.target.value)}
            placeholder={"https://directory.example.com/pet-shops\nhttps://example.com/listings"}
          />
          <p className={`mt-1 text-xs ${tooManyUrls ? "text-red-600" : "text-muted-foreground"}`}>
            One URL per line. {sourceUrls.length}/{MAX_SOURCE_URLS} used.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Best sources: a business <strong>directory / listing page</strong> (we extract each business it lists),
            a business&rsquo;s <strong>Contact page</strong>, or its <strong>homepage</strong>. We read the full page
            (including the footer) and pull the public business email.
          </p>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle className="text-base">Options</CardTitle>
        <Toggle checked={requireEmail} onChange={setRequireEmail} label="Require email" hint="Only keep leads where a business email was found." />
        <Toggle checked={verifyEmails} onChange={setVerifyEmails} label="Verify emails" hint={`Deliverability check — ${LEAD_CREDIT_COSTS.emailVerify} credit each.`} />
        <Toggle checked={syncToBrevo} onChange={setSyncToBrevo} label="Sync to Brevo" hint="Add verified, eligible leads to your Brevo list." />
      </Card>

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Estimated credits</p>
          <p className="text-xs text-muted-foreground">
            {sourceUrls.length} page scan{sourceUrls.length === 1 ? "" : "s"}
            {verifyEmails ? ` + up to ${boundedMax} email verifications` : ""} + campaign create.
          </p>
        </div>
        <div className="text-2xl font-bold text-brand-600">~{estCredits}</div>
      </Card>

      {error && <Alert variant="error" title="Search failed">{error}</Alert>}

      {result && (
        <Alert variant={result.toppedOut ? "warning" : "success"} title={result.toppedOut ? "Credits ran out" : "Search complete"}>
          <p>
            Found <strong>{result.leadsFound}</strong> lead{result.leadsFound === 1 ? "" : "s"}
            {result.verified ? <>, <strong>{result.verified}</strong> verified</> : null}. Used {result.creditsUsed} credit{result.creditsUsed === 1 ? "" : "s"}.
          </p>
          {result.message && <p className="mt-1">{result.message}</p>}
          {result.toppedOut && (
            <p className="mt-2">
              <Button asChild size="sm" variant="accent">
                <Link href="/dashboard/credits">Top up credits</Link>
              </Button>
            </p>
          )}
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="accent" size="lg" disabled={!canSubmit}>
          {running ? <><Spinner size="sm" /> Searching…</> : "Start lead search"}
        </Button>
        {running && <span className="text-sm text-muted-foreground">Creating campaign and gathering leads…</span>}
      </div>
    </form>
  );
}
