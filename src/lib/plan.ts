/**
 * Plan capability helpers. Free Trial = explore + light tasks; paid = pro.
 * Enforced server-side at the routes that gate "professional" resources.
 */
import type { createClient } from "@/lib/supabase/server";

type SB = Awaited<ReturnType<typeof createClient>>;

/** Free Trial resource limits (paid plans are unlimited on these). */
export const FREE_LIMITS = { wordpressSites: 1 };

export async function getUserPlan(supabase: SB): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "free";
  const { data } = await supabase.from("profiles").select("plan").eq("user_id", user.id).maybeSingle();
  return data?.plan ?? "free";
}

export function isFreePlan(plan: string | null | undefined): boolean {
  return (plan ?? "free") === "free";
}

/** Capabilities gated behind a paid plan. */
export function planAllowsAiVideo(plan: string): boolean { return !isFreePlan(plan); }
export function planAllowsAutopilotFull(plan: string): boolean { return !isFreePlan(plan); }
