/**
 * API key generation + hashing (Phase 7 — Module 7).
 *
 * Only the SHA-256 hash and a short prefix are stored; the plaintext secret is
 * returned to the caller exactly once at creation and never persisted. To verify
 * an incoming key, hash it and look up the matching key_hash.
 */
import { createHash, randomBytes } from "crypto";

const PREFIX = "cfk_"; // CreatorForge key

export function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `${PREFIX}${secret}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 12), // shown in the UI to identify the key
    hash: hashKey(plaintext),
  };
}
