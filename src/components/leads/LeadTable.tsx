"use client";

import { useState } from "react";
import { ExternalLink, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LeadStatusBadge } from "./LeadStatusBadge";

export type Lead = {
  id: string;
  business_name?: string | null;
  website?: string | null;
  email?: string | null;
  verification_status?: string | null;
  lead_status?: string | null;
  city?: string | null;
  country?: string | null;
  source_url?: string | null;
};

/**
 * Responsive lead table with row selection for bulk actions.
 * `onSelectionChange` receives the currently-checked lead ids.
 */
export function LeadTable({
  leads,
  onSelectionChange,
}: {
  leads: Lead[];
  onSelectionChange?: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function emit(next: Set<string>) {
    setSelected(next);
    onSelectionChange?.([...next]);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    emit(next);
  }

  function toggleAll() {
    if (selected.size === leads.length) emit(new Set());
    else emit(new Set(leads.map((l) => l.id)));
  }

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No leads yet"
        description="Run a lead search to populate this list with public business contacts."
        actionLabel="New lead search"
        href="/dashboard/leads/search"
      />
    );
  }

  const allChecked = selected.size === leads.length;

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border text-left text-xs text-muted-foreground">
          <tr>
            <th className="w-10 p-3">
              <input
                type="checkbox"
                aria-label="Select all leads"
                checked={allChecked}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-border accent-brand-600"
              />
            </th>
            <th className="p-3">Business</th>
            <th className="p-3">Email</th>
            <th className="p-3">Location</th>
            <th className="p-3">Source</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
              <td className="p-3">
                <input
                  type="checkbox"
                  aria-label={`Select ${lead.business_name ?? "lead"}`}
                  checked={selected.has(lead.id)}
                  onChange={() => toggle(lead.id)}
                  className="h-4 w-4 rounded border-border accent-brand-600"
                />
              </td>
              <td className="p-3 font-medium">
                {lead.website ? (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                  >
                    {lead.business_name || lead.website}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  <span>{lead.business_name || "—"}</span>
                )}
              </td>
              <td className="p-3">
                <div className="flex flex-col gap-1">
                  <span className="truncate text-muted-foreground">{lead.email || "—"}</span>
                  {lead.verification_status && <LeadStatusBadge status={lead.verification_status} />}
                </div>
              </td>
              <td className="p-3 text-muted-foreground">
                {[lead.city, lead.country].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="p-3">
                {lead.source_url ? (
                  <a
                    href={lead.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                  >
                    <span className="max-w-[160px] truncate">{lead.source_url.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="p-3">
                <LeadStatusBadge status={lead.lead_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
