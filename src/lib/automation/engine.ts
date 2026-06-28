/**
 * Automation engine (Phase 6 — Module 7). Evaluates a user's enabled rules for a
 * given trigger and runs their action. Called from the points where triggers
 * occur (e.g. render completion). Kept deliberately small and additive — new
 * triggers/actions slot in without touching callers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AutomationTrigger } from "@/lib/types";
import { emitNotification } from "@/lib/notifications";

export async function runTrigger(
  supabase: SupabaseClient,
  userId: string,
  trigger: AutomationTrigger,
  context: { title?: string; link?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  const { data: rules } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("user_id", userId)
    .eq("trigger", trigger)
    .eq("enabled", true);

  if (!rules?.length) return;

  for (const rule of rules) {
    switch (rule.action) {
      case "notify":
      case "warn":
        await emitNotification(supabase, {
          userId,
          type: rule.action === "warn" ? "credits_low" : "publish_success",
          title: rule.name,
          body: context.title ?? `Automation "${rule.name}" ran.`,
          link: context.link,
          metadata: { rule_id: rule.id, trigger },
        });
        break;
      case "schedule_publish":
      case "archive":
        // Architecture in place; actual scheduling/archival handled by the
        // respective modules. Record that the rule fired.
        break;
    }
    await supabase
      .from("automation_rules")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", rule.id);
  }
}
