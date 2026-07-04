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
  | "SUSPICIOUS_ACTIVITY"
  | "2FA_ENABLED"
  | "2FA_DISABLED"
  | "2FA_LOGIN_SUCCESS"
  | "2FA_LOGIN_FAILED"
  | "2FA_BACKUP_CODE_USED"
  | "2FA_BACKUP_CODES_REGENERATED"
  | "2FA_REQUIRED_FOR_ACTION";

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
