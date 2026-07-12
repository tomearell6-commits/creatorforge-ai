"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WORKFLOW_STEPS, getWorkflow, type WorkflowStepId } from "@/config/workflowCapabilities";
import type { ContentTypeId } from "@/config/publishingCapabilities";

type Row = {
  id: string; project_type: ContentTypeId; project_id: string; title: string | null;
  current_step: WorkflowStepId; completed_steps: WorkflowStepId[]; next_action: string | null; updated_at: string;
};

// Where "Continue Project" sends the user, by content type.
const STUDIO_ROUTE: Partial<Record<ContentTypeId, string>> = {
  seo_article: "/dashboard/seo/new", blog_article: "/dashboard/seo/new",
  book: "/dashboard/books/library", ebook: "/dashboard/books/library",
  design: "/dashboard/design", image: "/dashboard/design",
  ai_video: "/dashboard/create", ai_short: "/dashboard/create", social_video: "/dashboard/create", long_form_video: "/dashboard/create",
  advertisement: "/dashboard/ads", website: "/dashboard/build", app: "/dashboard/build",
  email_campaign: "/dashboard/autopilot/campaigns/new", real_estate: "/dashboard/design/industries/real-estate-architecture",
};

function pct(contentType: ContentTypeId, completed: WorkflowStepId[]): number {
  const total = getWorkflow(contentType)?.steps.length ?? WORKFLOW_STEPS.length;
  return Math.round((completed.length / total) * 100);
}

export function ContinueWorkflows() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/workflow/state").then((r) => r.json()).then((j) => setRows(j.active ?? [])).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  if (!loaded || rows.length === 0) return null; // hide the section entirely when empty

  return (
    <section>
      <h2 className="text-lg font-semibold">Continue where you left off</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {rows.map((r) => {
          const stepLabel = WORKFLOW_STEPS.find((s) => s.id === r.current_step)?.label ?? r.current_step;
          const route = STUDIO_ROUTE[r.project_type] ?? "/dashboard";
          return (
            <Card key={r.id} className="flex flex-col p-4">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{r.title || getWorkflow(r.project_type)?.label || "Project"}</span>
                <Badge variant="default" className="ml-auto capitalize">{r.project_type.replace(/_/g, " ")}</Badge>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="info">Step: {stepLabel}</Badge>
                <span className="text-xs text-muted-foreground">{pct(r.project_type, r.completed_steps)}% complete</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct(r.project_type, r.completed_steps)}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Next: {r.next_action ?? "Continue"}</p>
              <Link href={route} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
                Continue Project <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
