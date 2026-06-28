/**
 * Secret encryption at rest (Phase 8 — Module 3). AES-256-GCM for credentials we
 * must store and later reuse (WordPress application passwords, OAuth tokens).
 *
 * Encrypted values are tagged `enc:v1:<base64(iv|tag|ciphertext)>`. Decryption is
 * backward-compatible: anything without the tag is treated as legacy plaintext and
 * returned as-is, so existing rows keep working until rewritten. Requires
 * SECRETS_KEY (any string; hashed to a 32-byte key). If unset, values are stored
 * plaintext and a warning is logged — set SECRETS_KEY in production.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const TAG = "enc:v1:";

function key(): Buffer | null {
  const raw = process.env.SECRETS_KEY;
  if (!raw) return null;
  return createHash("sha256").update(raw).digest(); // 32 bytes
}

export function encryptSecret(plaintext: string): string {
  const k = key();
  if (!k) return plaintext; // degraded mode (dev) — document SECRETS_KEY for prod
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return TAG + Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith(TAG)) return value; // legacy plaintext
  const k = key();
  if (!k) return null;
  try {
    const buf = Buffer.from(value.slice(TAG.length), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", k, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
