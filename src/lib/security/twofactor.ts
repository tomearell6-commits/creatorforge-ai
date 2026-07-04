/**
 * Two-Factor Authentication service (server-only). All table writes use the
 * service-role client; user routes resolve the caller first via RLS session.
 *
 * Invariants:
 *  - TOTP secret is stored AES-256-GCM encrypted (encryptSecret) and is never
 *    returned to the client after verify-setup succeeds.
 *  - Backup codes exist only as SHA-256 hashes; shown once at generation.
 *  - Email codes live in user_2fa_challenges (hashed, 10-min expiry, 5 attempts).
 *  - 2FA codes themselves are NEVER logged — events carry method/purpose only.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret } from "@/lib/security/secrets";
import {
  generateTotpSecret,
  verifyTotp,
  totpUri,
  generateBackupCodes,
  hashBackupCode,
  generateEmailCode,
  hashEmailCode,
} from "@/lib/security/totp";

export type TwoFactorMethod = "totp" | "email";
export type ChallengePurpose = "login" | "action" | "setup";

export type TwoFactorStatus = {
  enabled: boolean;
  method: TwoFactorMethod | null;
  enabledAt: string | null;
  lastVerifiedAt: string | null;
  backupCodesRemaining: number;
};

export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
  const admin = createAdminClient();
  const { data: s } = await admin
    .from("user_2fa_settings")
    .select("method, enabled, enabled_at, last_verified_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!s?.enabled) {
    return { enabled: false, method: null, enabledAt: null, lastVerifiedAt: null, backupCodesRemaining: 0 };
  }
  const { count } = await admin
    .from("user_2fa_backup_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("used", false);
  return {
    enabled: true,
    method: (s.method as TwoFactorMethod) ?? "totp",
    enabledAt: s.enabled_at,
    lastVerifiedAt: s.last_verified_at,
    backupCodesRemaining: count ?? 0,
  };
}

/** Begin TOTP enrollment: create/overwrite a PENDING (enabled=false) secret. */
export async function beginTotpSetup(userId: string, email: string): Promise<{ secret: string; uri: string }> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("user_2fa_settings").select("enabled").eq("user_id", userId).maybeSingle();
  if (existing?.enabled) throw new Error("Two-factor authentication is already enabled.");

  const secret = generateTotpSecret();
  await admin.from("user_2fa_settings").upsert(
    {
      user_id: userId,
      method: "totp",
      secret_encrypted: encryptSecret(secret),
      enabled: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  return { secret, uri: totpUri(secret, email) };
}

/** Verify the code against the PENDING secret; on success enable + issue backup codes. */
export async function completeTotpSetup(userId: string, code: string): Promise<{ ok: boolean; backupCodes?: string[] }> {
  const admin = createAdminClient();
  const { data: s } = await admin
    .from("user_2fa_settings")
    .select("secret_encrypted, enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (!s || s.enabled) return { ok: false };
  const secret = decryptSecret(s.secret_encrypted);
  if (!secret || !verifyTotp(secret, code)) return { ok: false };

  const now = new Date().toISOString();
  await admin
    .from("user_2fa_settings")
    .update({ enabled: true, enabled_at: now, last_verified_at: now, updated_at: now })
    .eq("user_id", userId);
  const backupCodes = await issueBackupCodes(userId);
  return { ok: true, backupCodes };
}

/** Replace all backup codes with 10 fresh ones; returns plaintext ONCE. */
export async function issueBackupCodes(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const codes = generateBackupCodes(10);
  await admin.from("user_2fa_backup_codes").delete().eq("user_id", userId);
  await admin.from("user_2fa_backup_codes").insert(
    codes.map((c) => ({ user_id: userId, code_hash: hashBackupCode(c) }))
  );
  return codes;
}

/** Verify a TOTP code against the ENABLED secret. */
export async function verifyTotpForUser(userId: string, code: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: s } = await admin
    .from("user_2fa_settings")
    .select("secret_encrypted, enabled, method")
    .eq("user_id", userId)
    .maybeSingle();
  if (!s?.enabled || s.method !== "totp") return false;
  const secret = decryptSecret(s.secret_encrypted);
  if (!secret || !verifyTotp(secret, code)) return false;
  await admin
    .from("user_2fa_settings")
    .update({ last_verified_at: new Date().toISOString() })
    .eq("user_id", userId);
  return true;
}

/** Consume a backup code (single use). */
export async function consumeBackupCode(userId: string, code: string): Promise<boolean> {
  const admin = createAdminClient();
  const hash = hashBackupCode(code);
  const { data: row } = await admin
    .from("user_2fa_backup_codes")
    .select("id")
    .eq("user_id", userId)
    .eq("code_hash", hash)
    .eq("used", false)
    .maybeSingle();
  if (!row) return false;
  const { data: updated } = await admin
    .from("user_2fa_backup_codes")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("used", false) // guard against concurrent double-spend
    .select("id");
  return !!updated?.length;
}

const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;

/** Create an email challenge; returns the plaintext code for the caller to send. */
export async function createEmailChallenge(userId: string, purpose: ChallengePurpose): Promise<string> {
  const admin = createAdminClient();
  const { code, hash } = generateEmailCode();
  // Invalidate previous open challenges for the same purpose.
  await admin
    .from("user_2fa_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("consumed_at", null);
  await admin.from("user_2fa_challenges").insert({
    user_id: userId,
    purpose,
    code_hash: hash,
    expires_at: new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString(),
  });
  return code;
}

/** Verify + consume an email challenge. Counts attempts; expires after 10 min. */
export async function verifyEmailChallenge(
  userId: string,
  purpose: ChallengePurpose,
  code: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data: ch } = await admin
    .from("user_2fa_challenges")
    .select("id, code_hash, attempts, expires_at")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ch) return false;
  if (new Date(ch.expires_at).getTime() < Date.now() || ch.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
    await admin.from("user_2fa_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);
    return false;
  }
  if (ch.code_hash !== hashEmailCode(code)) {
    await admin.from("user_2fa_challenges").update({ attempts: ch.attempts + 1 }).eq("id", ch.id);
    return false;
  }
  await admin.from("user_2fa_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);
  await admin
    .from("user_2fa_settings")
    .update({ last_verified_at: new Date().toISOString() })
    .eq("user_id", userId);
  return true;
}

/**
 * Unified verification used by login + high-risk actions:
 * tries the user's primary method, then backup codes (format XXXX-XXXX-XXXX).
 * Returns which mechanism matched so callers can log/alert on backup usage.
 */
export async function verifyAnyFactor(
  userId: string,
  code: string,
  purpose: ChallengePurpose
): Promise<{ ok: boolean; via: "totp" | "email" | "backup" | null }> {
  const clean = code.trim();
  const looksLikeBackup = /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(clean) && /[A-Za-z]/.test(clean);
  if (!looksLikeBackup) {
    const admin = createAdminClient();
    const { data: s } = await admin
      .from("user_2fa_settings").select("method, enabled").eq("user_id", userId).maybeSingle();
    if (!s?.enabled) return { ok: false, via: null };
    if (s.method === "totp" && (await verifyTotpForUser(userId, clean))) return { ok: true, via: "totp" };
    if (s.method === "email" && (await verifyEmailChallenge(userId, purpose, clean))) return { ok: true, via: "email" };
  }
  if (await consumeBackupCode(userId, clean)) return { ok: true, via: "backup" };
  return { ok: false, via: null };
}

/** Disable 2FA and wipe secret + backup codes + open challenges. */
export async function disableTwoFactor(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("user_2fa_settings")
    .update({
      enabled: false,
      secret_encrypted: null,
      enabled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  await admin.from("user_2fa_backup_codes").delete().eq("user_id", userId);
  await admin
    .from("user_2fa_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("consumed_at", null);
}

/** Confirm the caller's password (used before disable/regenerate). */
export async function confirmPassword(email: string, password: string): Promise<boolean> {
  // A throwaway anon client validates credentials without touching caller cookies.
  const { createClient } = await import("@supabase/supabase-js");
  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}

// ---- Admin enforcement ------------------------------------------------------

export async function isAdmin2faEnforced(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("security_settings").select("enforce_admin_2fa").eq("id", 1).maybeSingle();
  return !!data?.enforce_admin_2fa;
}

export async function setAdmin2faEnforced(enforced: boolean, updatedBy: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("security_settings")
    .upsert({ id: 1, enforce_admin_2fa: enforced, updated_by: updatedBy, updated_at: new Date().toISOString() });
}

export async function userHas2faEnabled(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_2fa_settings").select("enabled").eq("user_id", userId).maybeSingle();
  return !!data?.enabled;
}
