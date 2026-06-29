/**
 * Forge AI Assistant configuration. Defaults live in code; admins override them
 * in system_settings under the "assistant" key. Read with the service-role admin
 * client (system_settings is admin-only), falling back to defaults.
 */
import type { createAdminClient } from "@/lib/supabase/admin";

export type AssistantConfig = {
  enabled: boolean;
  free_messages: number;       // free assistant messages per month
  cost_simple: number;         // navigation/help question
  cost_workflow: number;       // content workflow guidance
  cost_advanced: number;       // advanced strategy / generation support
  low_credit_threshold: number;
};

export const ASSISTANT_DEFAULTS: AssistantConfig = {
  enabled: true,
  free_messages: 10,
  cost_simple: 1,
  cost_workflow: 2,
  cost_advanced: 3,
  low_credit_threshold: 20,
};

type Admin = ReturnType<typeof createAdminClient>;

export async function getAssistantConfig(admin?: Admin): Promise<AssistantConfig> {
  if (!admin) return ASSISTANT_DEFAULTS;
  try {
    const { data } = await admin.from("system_settings").select("value").eq("key", "assistant").maybeSingle();
    return { ...ASSISTANT_DEFAULTS, ...((data?.value as Partial<AssistantConfig>) ?? {}) };
  } catch {
    return ASSISTANT_DEFAULTS;
  }
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
