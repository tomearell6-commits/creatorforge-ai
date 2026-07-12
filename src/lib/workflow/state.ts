/**
 * Unified workflow state helpers (SERVER-ONLY). One row per project in
 * project_workflow_state records its place in the six-stage journey. Owner-RLS
 * scopes everything to the signed-in user automatically.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nextWorkflowStep, nextActionLabel, type WorkflowStepId } from "@/config/workflowCapabilities";
import type { ContentTypeId } from "@/config/publishingCapabilities";

export type WorkflowStateInput = {
  projectType: ContentTypeId;
  projectId: string;
  title?: string;
  currentStep?: WorkflowStepId;
  completedSteps?: WorkflowStepId[];
  workflowStatus?: string;
  reviewStatus?: string;
  connectionStatus?: string;
  publishStatus?: string;
  promotionStatus?: string;
  analyticsStatus?: string;
  lastAction?: string;
};

export type WorkflowStateRow = {
  id: string; project_type: string; project_id: string; title: string | null;
  current_step: WorkflowStepId; completed_steps: WorkflowStepId[];
  workflow_status: string; review_status: string | null; connection_status: string | null;
  publish_status: string | null; promotion_status: string | null; analytics_status: string | null;
  last_action: string | null; next_action: string | null; updated_at: string;
};

/** Upsert a project's workflow state (keyed by user + type + project). */
export async function upsertWorkflowState(
  supabase: SupabaseClient, userId: string, input: WorkflowStateInput
): Promise<WorkflowStateRow | null> {
  const completed = input.completedSteps ?? [];
  const current = input.currentStep ?? nextWorkflowStep(input.projectType, completed) ?? "create";
  const next = nextActionLabel(input.projectType, completed);

  const row = {
    user_id: userId, project_type: input.projectType, project_id: input.projectId,
    title: input.title ?? null, current_step: current, completed_steps: completed,
    workflow_status: input.workflowStatus ?? "in_progress",
    review_status: input.reviewStatus ?? null, connection_status: input.connectionStatus ?? null,
    publish_status: input.publishStatus ?? null, promotion_status: input.promotionStatus ?? null,
    analytics_status: input.analyticsStatus ?? null,
    last_action: input.lastAction ?? null, next_action: next, updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("project_workflow_state")
    .upsert(row, { onConflict: "user_id,project_type,project_id" })
    .select("*").single();
  if (error) return null;
  return data as WorkflowStateRow;
}

export async function getWorkflowState(
  supabase: SupabaseClient, projectType: string, projectId: string
): Promise<WorkflowStateRow | null> {
  const { data } = await supabase
    .from("project_workflow_state")
    .select("*").eq("project_type", projectType).eq("project_id", projectId).maybeSingle();
  return (data as WorkflowStateRow) ?? null;
}

/** Recent in-progress projects for "Continue where you left off". */
export async function listActiveWorkflows(supabase: SupabaseClient, limit = 8): Promise<WorkflowStateRow[]> {
  const { data } = await supabase
    .from("project_workflow_state")
    .select("*").order("updated_at", { ascending: false }).limit(limit);
  return (data as WorkflowStateRow[]) ?? [];
}
