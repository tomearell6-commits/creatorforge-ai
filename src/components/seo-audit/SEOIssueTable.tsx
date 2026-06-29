"use client";

import { useState } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";

type Issue = { issue_type: string; severity: string; title: string; description?: string; recommended_fix?: string };

const ICON: Record<string, React.ReactNode> = {
  critical: <AlertOctagon className="h-4 w-4 text-red-600" />, warning: <AlertTriangle className="h-4 w-4 text-amber-600" />, passed: <CheckCircle2 className="h-4 w-4 text-brand-600" />,
};

/** Grouped issue list: Critical, Warnings, Passed. */
export function SEOIssueTable({ issues }: { issues: Issue[] }) {
  const groups: [string, Issue[]][] = [
    ["Critical Issues", issues.filter((i) => i.severity === "critical")],
    ["Warnings", issues.filter((i) => i.severity === "warning")],
    ["Passed Checks", issues.filter((i) => i.severity === "passed")],
  ];
  return (
    <div className="space-y-4">
      {groups.map(([label, list]) => list.length > 0 && (
        <div key={label}>
          <h4 className="mb-2 text-sm font-semibold">{label} <span className="text-muted-foreground">({list.length})</span></h4>
          <div className="space-y-1.5">{list.map((i, idx) => <IssueRow key={idx} issue={i} />)}</div>
        </div>
      ))}
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const [open, setOpen] = useState(false);
  const expandable = issue.severity !== "passed" && (issue.description || issue.recommended_fix);
  return (
    <div className="rounded-lg border border-border">
      <button type="button" onClick={() => expandable && setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm">
        {ICON[issue.severity]}
        <span className="flex-1">{issue.title}</span>
        <span className="text-xs capitalize text-muted-foreground">{issue.issue_type}</span>
      </button>
      {open && expandable && (
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {issue.description && <p>{issue.description}</p>}
          {issue.recommended_fix && <p className="mt-1"><span className="font-medium text-foreground">Fix:</span> {issue.recommended_fix}</p>}
        </div>
      )}
    </div>
  );
}
