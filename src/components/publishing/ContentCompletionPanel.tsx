"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Download, Send, CalendarClock, Megaphone, Save, Copy, Pencil, Sparkles, PlusCircle, Users, BarChart3, PartyPopper, Plug, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PublishPromoteDrawer } from "./PublishPromoteDrawer";
import { ConnectAccountModal, type ConnectItem } from "@/components/integrations/ConnectAccountModal";
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
  const [connectOpen, setConnectOpen] = useState(false);
  // Connectable accounts (social + ad platforms) for this content type, with
  // their connected status — powers the prominent "Connect accounts" step.
  const [connectItems, setConnectItems] = useState<ConnectItem[] | null>(null);
  const connectedCount = connectItems ? connectItems.filter((i) => i.connected).length : null;

  function loadConnectItems() {
    fetch(`/api/publishing/capabilities?contentType=${props.contentType}`)
      .then((r) => r.json())
      .then((j) => {
        const all = [...(j.summary?.destinations ?? []), ...(j.summary?.adPlatforms ?? [])];
        setConnectItems(
          all.map((d: ConnectItem) => ({ id: d.id, label: d.label, brandIcon: d.brandIcon, accountType: d.accountType, live: d.live, connected: d.connected, permissions: d.permissions }))
        );
      })
      .catch(() => {});
  }
  const capsFetched = useRef(false);
  useEffect(() => {
    if (capsFetched.current || !cap) return;
    capsFetched.current = true;
    loadConnectItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.contentType, cap]);

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

        {/* Connect step — link social/publishing accounts before publishing. */}
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-brand-500/30 bg-brand-50/40 p-3 dark:bg-brand-900/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Plug className="h-4 w-4 text-brand-600" />
            <span>
              <span className="font-semibold">Connect your accounts</span>
              <span className="text-muted-foreground"> to publish, schedule, or promote.</span>
              {connectedCount != null && connectedCount > 0 && (
                <span className="ml-1 inline-flex items-center gap-1 text-brand-700 dark:text-brand-300"><Check className="h-3.5 w-3.5" /> {connectedCount} connected</span>
              )}
            </span>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConnectOpen(true)}>
              <Plug className="h-4 w-4" /> Connect accounts
            </Button>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/manage/integrations">Manage</Link></Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">{cap.primaryActions.map((a) => renderBtn(a, true))}</div>
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

      <ConnectAccountModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        title="Connect your accounts"
        subtitle="Link your social, WordPress, ads, or email accounts to publish and promote. Official sign-in only — never your password."
        items={(connectItems ?? []).filter((i) => !i.connected)}
        onConnected={() => { setConnectOpen(false); loadConnectItems(); }}
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
