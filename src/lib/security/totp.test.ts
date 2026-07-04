import { describe, it, expect } from "vitest";
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  totpCode,
  verifyTotp,
  totpUri,
  generateBackupCodes,
  hashBackupCode,
  generateEmailCode,
  hashEmailCode,
} from "./totp";

// RFC 6238 Appendix B secret: ASCII "12345678901234567890"
const RFC_SECRET_B32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("base32 (RFC 4648)", () => {
  it("encodes the RFC secret correctly", () => {
    expect(base32Encode(Buffer.from("12345678901234567890"))).toBe(RFC_SECRET_B32);
  });
  it("round-trips random data", () => {
    for (const len of [1, 5, 10, 20, 33]) {
      const buf = Buffer.from(Array.from({ length: len }, (_, i) => (i * 37 + len) % 256));
      expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
    }
  });
  it("tolerates lowercase, spaces and padding", () => {
    const b = base32Decode(RFC_SECRET_B32.toLowerCase() + "==");
    expect(b.toString()).toBe("12345678901234567890");
  });
  it("rejects invalid characters", () => {
    expect(() => base32Decode("A1@#")).toThrow();
  });
});

describe("TOTP (RFC 6238 test vectors, SHA-1, last 6 of the 8-digit vectors)", () => {
  const vectors: [number, string][] = [
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
    [20000000000, "353130"],
  ];
  for (const [sec, expected] of vectors) {
    it(`T=${sec}s → ${expected}`, () => {
      expect(totpCode(RFC_SECRET_B32, sec * 1000)).toBe(expected);
    });
  }

  it("verifies the current code and ±1 step for clock drift", () => {
    const t = 1111111111 * 1000;
    expect(verifyTotp(RFC_SECRET_B32, "050471", t)).toBe(true);        // current
    expect(verifyTotp(RFC_SECRET_B32, "081804", t)).toBe(true);        // previous step (1111111109)
    expect(verifyTotp(RFC_SECRET_B32, "287082", t)).toBe(false);       // way off
    expect(verifyTotp(RFC_SECRET_B32, "000000", t)).toBe(false);
  });

  it("rejects malformed codes", () => {
    expect(verifyTotp(RFC_SECRET_B32, "12345")).toBe(false);
    expect(verifyTotp(RFC_SECRET_B32, "abcdef")).toBe(false);
    expect(verifyTotp(RFC_SECRET_B32, "")).toBe(false);
  });

  it("accepts codes typed with spaces", () => {
    expect(verifyTotp(RFC_SECRET_B32, "050 471", 1111111111 * 1000)).toBe(true);
  });
});

describe("secret + URI generation", () => {
  it("generates a 32-char base32 secret (20 bytes of entropy)", () => {
    const s = generateTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(generateTotpSecret()).not.toBe(s);
  });
  it("builds a standard otpauth URI with the CreatorsForge issuer", () => {
    const uri = totpUri("ABC234", "user@example.com");
    expect(uri).toContain("otpauth://totp/CreatorsForge.io:user%40example.com");
    expect(uri).toContain("secret=ABC234");
    expect(uri).toContain("issuer=CreatorsForge.io");
    expect(uri).toContain("period=30");
  });
});

describe("backup codes", () => {
  it("generates 10 unique codes in XXXX-XXXX-XXXX format", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });
  it("hashes ignore dashes and case so users can paste either form", () => {
    expect(hashBackupCode("K7QW-2MRD-P4XZ")).toBe(hashBackupCode("k7qw2mrdp4xz"));
    expect(hashBackupCode("K7QW-2MRD-P4XZ")).not.toBe(hashBackupCode("K7QW-2MRD-P4XA"));
    expect(hashBackupCode("AAAA-AAAA-AAAA")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("email codes", () => {
  it("generates 6-digit codes whose hash verifies", () => {
    const { code, hash } = generateEmailCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(hashEmailCode(code)).toBe(hash);
    expect(hashEmailCode("000000" === code ? "000001" : "000000")).not.toBe(hash);
  });
});
