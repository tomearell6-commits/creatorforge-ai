import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret } from "./secrets";

describe("secrets (AES-256-GCM)", () => {
  beforeAll(() => { process.env.SECRETS_KEY = "test-secret-key-for-unit-tests"; });

  it("round-trips an encrypted value", () => {
    const plain = "w9tQ 8fg7 Ui2j HcTN gfaw y7qd";
    const enc = encryptSecret(plain);
    expect(enc.startsWith("enc:v1:")).toBe(true);
    expect(enc).not.toContain(plain);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("treats untagged values as legacy plaintext", () => {
    expect(decryptSecret("legacy-plaintext")).toBe("legacy-plaintext");
  });

  it("returns null for tampered ciphertext", () => {
    const enc = encryptSecret("hello");
    const tampered = enc.slice(0, -4) + "AAAA";
    expect(decryptSecret(tampered)).toBeNull();
  });

  it("handles null/undefined", () => {
    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret(undefined)).toBeNull();
  });
});
