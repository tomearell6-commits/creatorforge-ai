/**
 * 2FA verification cookie — proves "this browser completed 2FA for user X".
 * HMAC-SHA256 signed with SECRETS_KEY via Web Crypto so the SAME module runs in
 * Edge middleware (verify) and Node route handlers (issue). Stateless: value is
 * `v1.<userId>.<expiresAtSec>.<base64url sig>`. No secrets inside the cookie.
 */

export const TWO_FACTOR_COOKIE = "cf2fa";
export const TWO_FACTOR_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  // btoa exists in Edge + Node 18+
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(payload: string): Promise<string | null> {
  const secret = process.env.SECRETS_KEY;
  if (!secret) return null; // degraded dev mode — cookie can't be issued/verified
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

/** Issue the signed cookie value after a successful 2FA verification. */
export async function issueTwoFactorCookie(userId: string): Promise<string | null> {
  const exp = Math.floor(Date.now() / 1000) + TWO_FACTOR_COOKIE_MAX_AGE;
  const payload = `v1.${userId}.${exp}`;
  const sig = await hmac(payload);
  return sig ? `${payload}.${sig}` : null;
}

/** Verify cookie value belongs to userId and hasn't expired. Edge-safe. */
export async function verifyTwoFactorCookie(value: string | undefined, userId: string): Promise<boolean> {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const [, uid, expStr, sig] = parts;
  if (uid !== userId) return false;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = await hmac(`v1.${uid}.${expStr}`);
  if (!expected || expected.length !== sig.length) return false;
  // Constant-time-ish compare (both are fixed-length HMAC outputs).
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

/** Whether cookies can be signed at all (SECRETS_KEY present). When false the
 *  middleware must NOT enforce 2FA, or users could never satisfy the check. */
export function twoFactorCookieAvailable(): boolean {
  return !!process.env.SECRETS_KEY;
}

/**
 * Short-lived "2FA is OFF for this user" marker (10 minutes) so the middleware
 * doesn't query the database on every request for users without 2FA.
 */
export async function issueOffMarker(userId: string): Promise<string | null> {
  const exp = Math.floor(Date.now() / 1000) + 10 * 60;
  const payload = `off1.${userId}.${exp}`;
  const sig = await hmac(payload);
  return sig ? `${payload}.${sig}` : null;
}

export async function verifyOffMarker(value: string | undefined, userId: string): Promise<boolean> {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "off1") return false;
  const [, uid, expStr, sig] = parts;
  if (uid !== userId) return false;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = await hmac(`off1.${uid}.${expStr}`);
  return !!expected && expected === sig;
}

/**
 * Short-lived action token for high-risk operations (5 minutes). Same signing
 * scheme, distinct prefix so a login cookie can never satisfy an action check.
 */
export async function issueActionToken(userId: string): Promise<string | null> {
  const exp = Math.floor(Date.now() / 1000) + 5 * 60;
  const payload = `act1.${userId}.${exp}`;
  const sig = await hmac(payload);
  return sig ? `${payload}.${sig}` : null;
}

export async function verifyActionToken(token: string | undefined | null, userId: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "act1") return false;
  const [, uid, expStr, sig] = parts;
  if (uid !== userId) return false;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = await hmac(`act1.${uid}.${expStr}`);
  return !!expected && expected === sig;
}
