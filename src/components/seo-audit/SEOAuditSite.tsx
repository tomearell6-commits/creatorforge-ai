"use client";

import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type Essential = { id: string; label: string; required: boolean; found: boolean; url: string | null; linkedFromFooter: boolean };
type Site = {
  pagesCrawled: number; pagesDiscovered: number; isShop: boolean; essentials: Essential[];
  footer: { found: boolean; linkCount: number; hasContact: boolean; hasCopyright: boolean };
  trust: { emails: string[]; phones: string[]; addressHint: boolean };
  duplicateTitles: unknown[]; missingDescriptions: string[]; missingH1: string[]; thinPages: string[]; brokenLinks: string[]; imagesMissingAlt: number;
};

const Tick = ({ ok, warn }: { ok: boolean; warn?: boolean }) => <span className={ok ? "text-emerald-600" : warn ? "text-amber-600" : "text-red-600"}>{ok ? "✔" : warn ? "•" : "✘"}</span>;

/** What the whole-site read found: essential pages, footer, contact details, structure counts. */
export function SEOAuditSite({ report }: { report: { site?: Site } }) {
  const s = report?.site;
  if (!s) {
    return (
      <Card>
        <CardTitle className="text-base">Whole-site check</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">A Quick audit reads the home page only. Run a <strong>Full Audit</strong> to read up to 25 pages, check that your essential pages exist (About, Contact, FAQ, Privacy, Terms), review your footer and contact details, and get an itemised list of fixes with their prices.</p>
      </Card>
    );
  }
  const counts: [string, number][] = [
    ["Pages sharing a title", s.duplicateTitles.length], ["Pages without a meta description", s.missingDescriptions.length],
    ["Pages without a main heading", s.missingH1.length], ["Thin pages (under 300 words)", s.thinPages.length],
    ["Images without alt text", s.imagesMissingAlt], ["Broken internal links", s.brokenLinks.length],
  ];
  return (
    <Card className="space-y-4">
      <div>
        <CardTitle className="text-base">Site structure</CardTitle>
        <p className="text-xs text-muted-foreground">Read {s.pagesCrawled} page{s.pagesCrawled === 1 ? "" : "s"}{s.pagesDiscovered > s.pagesCrawled ? ` of about ${s.pagesDiscovered}` : ""}. {s.isShop ? "This looks like an online shop." : "This looks like a business or content site."}</p>
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold">Pages every trustworthy site has</p>
        <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {s.essentials.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-2 border-b border-border/40 py-1">
              <span><Tick ok={e.found} warn={!e.required} /> {e.label}{!e.required && !e.found ? <span className="text-xs text-muted-foreground"> (recommended)</span> : null}</span>
              <span className="text-xs text-muted-foreground">{e.found ? (e.linkedFromFooter ? "linked in footer" : "not in footer") : e.required ? "missing" : "none"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-semibold">Footer</p>
          <ul className="space-y-0.5 text-sm">
            <li><Tick ok={s.footer.found} /> Footer section {s.footer.found ? `(${s.footer.linkCount} links)` : "not found"}</li>
            <li><Tick ok={s.footer.hasContact} /> Contact details in the footer</li>
            <li><Tick ok={s.footer.hasCopyright} /> Copyright line</li>
          </ul>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Trust signals found</p>
          <ul className="space-y-0.5 text-sm">
            <li><Tick ok={s.trust.emails.length > 0} /> Email address {s.trust.emails[0] ? <span className="text-muted-foreground">({s.trust.emails[0]})</span> : null}</li>
            <li><Tick ok={s.trust.phones.length > 0} warn /> Phone number</li>
            <li><Tick ok={s.trust.addressHint} warn /> Street address</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {counts.map(([label, n]) => <Badge key={label} variant={n === 0 ? "success" : "warning"}>{label}: {n}</Badge>)}
      </div>
    </Card>
  );
}
