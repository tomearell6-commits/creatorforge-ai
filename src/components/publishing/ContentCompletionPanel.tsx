"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Download, Send, CalendarClock, Megaphone, Save, Copy, Pencil, Sparkles, PlusCircle, Users, BarChart3, PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PublishPromoteDrawer } from "./PublishPromoteDrawer";
import { UnifiedWorkflowStepper } from "@/components/workflow/UnifiedWorkflowStepper";
import { AnalyzePanel } from "@/components/workflow/AnalyzePanel";
import { getCapability, type ContentTypeId, type CompletionActionId } from "@/config/publishingCapabilities";

export type CompletionPanelProps = {
  contentType: ContentTypeId;
  title?: string;
  sourceKind?: string;
  sourceId?: string | null;
  assetUrl?: string | null;
  contentHtml?: string | null;
  downloadUrl?: string | null;
  previewUrl?: string | null;
  baseMetadata?: { title?: string; description?: string; caption?: string; hashtags?: string[] };
  onSaveDraft?: () => void;
  onDuplicate?: () => void;
  onEditAgain?: () => void;
  onCreateVariation?: () => void;
  analyticsHref?: string;
};

const ICONS: Record<CompletionActionId, typeof Eye> = {
  preview: Eye, download: Download, publish: Send, schedule: CalendarClock, promote: Megaphone, save_draft: Save,
  duplicate: Copy, edit_again: Pencil, create_variation: Sparkles, add_to_campaign: PlusCircle, share_team: Users, view_analytics: BarChart3,
};
const LABELS: Record<CompletionActionId, string> = {
  preview: "Preview", download: "Download", publish: "Publish now", schedule: "Schedule", promote: "Promote", save_draft: "Save draft",
  duplicate: "Duplicate", edit_again: "Edit again", create_variation: "Create variation", add_to_campaign: "Add to campaign", share_team: "Share with team", view_analytics: "View analytics",
};

export function ContentCompletionPanel(props: CompletionPanelProps) {
  const cap = getCapability(props.contentType);
  const [drawer, setDrawer] = useState<null | "publish" | "schedule" | "promote" | "export">(null);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);

  // Adopting the six-stage workflow: mounting this panel records that the project
  // reached "created, ready for review" so it surfaces in "Continue where you
  // left off". Fire-and-forget, once. (Studios that publish update it further.)
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current || !props.sourceId || !cap) return;
    recorded.current = true;
    fetch("/api/workflow/state", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectType: props.contentType, projectId: props.sourceId, title: props.title ?? cap.label,
        completedSteps: ["create"], currentStep: "review", lastAction: "Content created",
      }),
    }).catch(() => {});
  }, [props.sourceId, props.contentType, props.title, cap]);

  if (!cap) return null;

  function handle(action: CompletionActionId) {
    switch (action) {
      case "preview": if (props.previewUrl || props.assetUrl) window.open(props.previewUrl ?? props.assetUrl ?? "#", "_blank"); break;
      case "download": if (props.downloadUrl || props.assetUrl) { const a = document.createElement("a"); a.href = props.downloadUrl ?? props.assetUrl ?? "#"; a.download = ""; a.click(); } else setDrawer("export"); break;
      case "publish": setDrawer("publish"); break;
      case "schedule": setDrawer("schedule"); break;
      case "promote": setDrawer("promote"); break;
      case "add_to_campaign": setDrawer("promote"); break;
      case "save_draft": props.onSaveDraft?.(); break;
      case "duplicate": props.onDuplicate?.(); break;
      case "edit_again": props.onEditAgain?.(); break;
      case "create_variation": props.onCreateVariation?.(); break;
      default: break;
    }
  }

  const renderBtn = (action: CompletionActionId, primary: boolean) => {
    const Icon = ICONS[action];
    if (action === "share_team") return <Button key={action} asChild variant="outline" size="sm"><Link href="/dashboard/manage/settings"><Icon className="h-4 w-4" /> {LABELS[action]}</Link></Button>;
    if (action === "view_analytics") {
      if (props.sourceId) return <Button key={action} variant="outline" size="sm" onClick={() => setAnalyzeOpen(true)}><Icon className="h-4 w-4" /> {LABELS[action]}</Button>;
      return <Button key={action} asChild variant="outline" size="sm"><Link href={props.analyticsHref ?? "/dashboard/grow/analytics"}><Icon className="h-4 w-4" /> {LABELS[action]}</Link></Button>;
    }
    return (
      <Button key={action} variant={primary ? (action === "publish" ? "primary" : "secondary") : "outline"} size="sm" onClick={() => handle(action)}>
        <Icon className="h-4 w-4" /> {LABELS[action]}
      </Button>
    );
  };

  return (
    <>
      <Card className="border-brand-500/30 p-5">
        <div className="flex items-center gap-2">
          <PartyPopper className="h-5 w-5 text-brand-600" />
          <h2 className="text-base font-semibold">{props.title ? `"${props.title}" is ready` : `Your ${cap.label.toLowerCase()} is ready`}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Here&rsquo;s your journey — your content is created. Review it, then connect, publish, promote, and analyze. All from here.</p>

        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2">
          <UnifiedWorkflowStepper contentType={props.contentType} currentStep="review" completedSteps={["create"]} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">{cap.primaryActions.map((a) => renderBtn(a, true))}</div>
        {cap.secondaryActions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">{cap.secondaryActions.map((a) => renderBtn(a, false))}</div>
        )}
      </Card>

      <PublishPromoteDrawer
        open={drawer !== null}
        initialTab={drawer ?? "publish"}
        onClose={() => setDrawer(null)}
        contentType={props.contentType}
        sourceKind={props.sourceKind}
        sourceId={props.sourceId}
        assetUrl={props.assetUrl}
        contentHtml={props.contentHtml}
        downloadUrl={props.downloadUrl}
        baseMetadata={props.baseMetadata}
      />

      {props.sourceId && (
        <AnalyzePanel
          open={analyzeOpen}
          onClose={() => setAnalyzeOpen(false)}
          contentType={props.contentType}
          projectId={props.sourceId}
          title={props.title}
        />
      )}
    </>
  );
}
