/**
 * Token vault — encrypted OAuth token storage + auto-refresh.
 * SERVER-ONLY (service-role client; the tokens table has no RLS policies).
 * Uses the platform's AES-256-GCM secrets layer (SECRETS_KEY).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptSecret, decryptSecret } from "@/lib/security/secrets";
import { refreshAccessToken, type TokenSet } from "./providers";

export async function storeTokens(admin: SupabaseClient, accountId: string, userId: string, tokens: TokenSet): Promise<void> {
  await admin.from("email_provider_tokens").upsert(
    {
      account_id: accountId, user_id: userId,
      access_token_enc: tokens.accessToken ? encryptSecret(tokens.accessToken) : null,
      refresh_token_enc: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
      token_expires_at: tokens.expiresAt ?? null,
      scopes: tokens.scopes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );
}

/** Get a valid access token for an account, refreshing when expired. Throws when unavailable. */
export async function getAccessToken(
  admin: SupabaseClient,
  accountId: string,
  family: "google" | "microsoft"
): Promise<string> {
  const { data: row } = await admin
    .from("email_provider_tokens")
    .select("access_token_enc, refresh_token_enc, token_expires_at, user_id")
    .eq("account_id", accountId)
    .maybeSingle();
  if (!row?.access_token_enc) throw new Error("No stored token — reconnect the account.");

  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) {
    const token = decryptSecret(row.access_token_enc);
    if (!token) throw new Error("Stored token could not be decrypted — reconnect the account.");
    return token;
  }
  const refreshTokenPlain = decryptSecret(row.refresh_token_enc);
  if (!refreshTokenPlain) throw new Error("Token expired and no refresh token — reconnect the account.");
  const refreshed = await refreshAccessToken(family, refreshTokenPlain);
  await storeTokens(admin, accountId, row.user_id, refreshed);
  return refreshed.accessToken;
}

/** Hard-delete stored tokens (disconnect / delete-my-data). */
export async function deleteTokens(admin: SupabaseClient, accountId: string): Promise<void> {
  await admin.from("email_provider_tokens").delete().eq("account_id", accountId);
}
