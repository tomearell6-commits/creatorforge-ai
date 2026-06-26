import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for trusted server-side contexts (e.g. the
 * Paddle webhook), where there is no user session but we must write to a
 * specific user's rows. Bypasses RLS — NEVER import this into client code, and
 * only ever act on a user id you've authenticated out-of-band (a verified
 * webhook payload). Requires SUPABASE_SERVICE_ROLE_KEY (secret).
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin client not configured (SUPABASE_SERVICE_ROLE_KEY missing)");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
