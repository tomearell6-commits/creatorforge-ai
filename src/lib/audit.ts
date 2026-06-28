/**
 * Audit logging (Phase 7 — Module 10). Appends an immutable event to
 * audit_logs. Used across the app for security/compliance events (login,
 * publishing, payments, credit/role changes, API key + workspace changes).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    userId?: string | null;
    actorEmail?: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    ip?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await supabase.from("audit_logs").insert({
    user_id: params.userId ?? null,
    actor_email: params.actorEmail ?? null,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    ip: params.ip ?? null,
    metadata: params.metadata ?? {},
  });
}
