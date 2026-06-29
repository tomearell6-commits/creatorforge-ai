"use client";

type AuditRow = { id: string; website_url: string; audit_type: string; status: string; overall_score: number | null; created_at: string };

/** Past audits list; clicking loads one into the report view. */
export function SEOAuditHistory({ audits, onOpen }: { audits: AuditRow[]; onOpen: (id: string) => void }) {
  if (!audits.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Recent audits</h3>
      <div className="space-y-1.5">
        {audits.map((a) => (
          <button key={a.id} onClick={() => onOpen(a.id)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted">
            <span className="truncate">{a.website_url.replace(/^https?:\/\//, "")}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="capitalize">{a.audit_type}</span>
              {a.overall_score != null && <span className={`rounded-full px-2 py-0.5 font-medium ${a.overall_score >= 80 ? "bg-brand-100 text-brand-700" : a.overall_score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{a.overall_score}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
