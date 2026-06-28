/**
 * Notification helper (Phase 6). Inserts an in-app notification row. Email
 * delivery is architected via NOTIFY_EMAIL — when enabled and a transport is
 * configured, the same payload would be sent by email (left as a hook).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "@/lib/types";

export async function emitNotification(
  supabase: SupabaseClient,
  params: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
    metadata: params.metadata ?? {},
  });

  // Email architecture hook: when NOTIFY_EMAIL=true, dispatch via the same
  // Resend transport used for auth emails. Intentionally a no-op placeholder.
  if (process.env.NOTIFY_EMAIL === "true") {
    // await sendEmail({ to: ..., subject: params.title, html: params.body })
  }
}
