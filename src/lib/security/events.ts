/**
 * Security-event audit logging. Writes go through the service-role admin client
 * (users can only READ their own events via RLS). Never persist passwords or
 * reset tokens — metadata is caller-controlled and must stay non-sensitive.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/security/ratelimit";

export type SecurityEventType =
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_CHANGE_FAILED"
  | "SUSPICIOUS_ACTIVITY";

export async function logSecurityEvent(params: {
  eventType: SecurityEventType;
  req: Request;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("security_events").insert({
      user_id: params.userId ?? null,
      event_type: params.eventType,
      ip_address: clientIp(params.req),
      user_agent: params.req.headers.get("user-agent")?.slice(0, 400) ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Never let audit logging break the security flow (e.g. admin key absent in dev).
  }
}
