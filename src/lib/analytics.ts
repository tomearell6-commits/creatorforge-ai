/**
 * Analytics helper (Phase 6). Appends a metric event to analytics_events.
 * The Analytics dashboard aggregates these (plus core tables) into charts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsEventType } from "@/lib/types";

export async function logEvent(
  supabase: SupabaseClient,
  params: {
    userId: string;
    eventType: AnalyticsEventType;
    value?: number;
    platform?: string;
    projectId?: string | null;
    workspaceId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await supabase.from("analytics_events").insert({
    user_id: params.userId,
    event_type: params.eventType,
    value: params.value ?? 1,
    platform: params.platform ?? null,
    project_id: params.projectId ?? null,
    workspace_id: params.workspaceId ?? null,
    metadata: params.metadata ?? {},
  });
}
