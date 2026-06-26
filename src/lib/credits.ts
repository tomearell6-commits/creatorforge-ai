/**
 * Credit usage tracking helpers.
 *
 * Deduction is atomic in Postgres via the deduct_credits() function (see
 * supabase/schema.sql) — it decrements profiles.credits only if the balance is
 * sufficient and writes a row to the credit_usage ledger in the same statement.
 */

import { createClient } from "@/lib/supabase/server";

/** Current credit balance for the signed-in user (0 if not signed in). */
export async function getCreditBalance(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data } = await supabase
    .from("profiles")
    .select("credits")
    .eq("user_id", user.id)
    .single();

  return data?.credits ?? 0;
}

/**
 * Atomically deduct credits from the signed-in user and log the usage.
 * Returns the new balance, or null if the balance was insufficient.
 */
export async function deductCredits(amount: number, reason: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deduct_credits", {
    p_amount: amount,
    p_reason: reason,
  });

  if (error) {
    console.error("deduct_credits failed:", error.message);
    return null;
  }
  return data as number | null;
}
