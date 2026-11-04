import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The plugin's secret. It is shown to the owner ONCE when pull delivery is switched on; only its sha256 is stored,
 * so a database leak never reveals a working token. 32 random bytes, so guessing is not a realistic attack.
 */
export const TOKEN_PREFIX = "cfp_";

export function generatePullToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

export const hashPullToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Constant-time check of a presented token against the stored hash. */
export function tokenMatches(presented: string | null | undefined, storedHash: string | null | undefined): boolean {
  if (!presented || !storedHash || !presented.startsWith(TOKEN_PREFIX) || presented.length < 40 || presented.length > 120) return false;
  const a = Buffer.from(hashPullToken(presented), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** "Authorization: Bearer cfp_..." -> the token, or null. */
export function bearerToken(header: string | null | undefined): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec((header ?? "").trim());
  return m ? m[1] : null;
}
