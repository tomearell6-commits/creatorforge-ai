/**
 * TOTP (RFC 6238) + Base32 (RFC 4648) — implemented on node:crypto only, so the
 * exact algorithm is auditable and unit-tested against the RFC test vectors.
 * SHA-1 / 30-second period / 6 digits — what Google Authenticator, Microsoft
 * Authenticator, Authy and 1Password all expect from an otpauth:// URI.
 * Verification accepts ±1 time step for clock drift.
 */
import { createHmac, randomBytes, timingSafeEqual, createHash } from "crypto";

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, "").replace(/[\s-]/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** 20 random bytes → 32-char base32 secret (the standard authenticator size). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secretB32: string, counter: number, digits = 6): string {
  const key = base32Decode(secretB32);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", key).update(msg).digest();
  const offset = h[h.length - 1] & 0x0f;
  const code =
    (((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3]) %
    10 ** digits;
  return code.toString().padStart(digits, "0");
}

export function totpCode(secretB32: string, atMs = Date.now(), periodSec = 30): string {
  return hotp(secretB32, Math.floor(atMs / 1000 / periodSec));
}

/** Constant-time compare; accepts current step ±1 for clock drift. */
export function verifyTotp(secretB32: string, code: string, atMs = Date.now(), periodSec = 30): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const step = Math.floor(atMs / 1000 / periodSec);
  for (const c of [step, step - 1, step + 1]) {
    const expected = hotp(secretB32, c);
    if (expected.length === clean.length && timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) {
      return true;
    }
  }
  return false;
}

/** otpauth:// URI encoded into the QR the authenticator app scans. */
export function totpUri(secretB32: string, accountEmail: string, issuer = "CreatorsForge.io"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}`;
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ---- Backup codes -----------------------------------------------------------

/** 10 codes like "K7QW-2MRD-P4XZ" — unambiguous alphabet, ~58 bits each. */
export function generateBackupCodes(count = 10): string[] {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/L/O/0/1 lookalikes
  const codes: string[] = [];
  while (codes.length < count) {
    let raw = "";
    const bytes = randomBytes(12);
    for (let i = 0; i < 12; i++) raw += alphabet[bytes[i] % alphabet.length];
    const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

/** Hash for storage/lookup — normalized so users can paste with/without dashes. */
export function hashBackupCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return createHash("sha256").update(`cf-backup:${normalized}`).digest("hex");
}

/** 6-digit email verification code + its storage hash. */
export function generateEmailCode(): { code: string; hash: string } {
  const code = (randomBytes(4).readUInt32BE(0) % 1_000_000).toString().padStart(6, "0");
  return { code, hash: createHash("sha256").update(`cf-email2fa:${code}`).digest("hex") };
}

export function hashEmailCode(code: string): string {
  return createHash("sha256").update(`cf-email2fa:${code.replace(/\s/g, "")}`).digest("hex");
}
