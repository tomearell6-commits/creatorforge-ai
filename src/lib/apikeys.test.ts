import { describe, it, expect } from "vitest";
import { generateApiKey, hashKey } from "./apikeys";

describe("api keys", () => {
  it("generates a cfk_ key with matching hash + prefix", () => {
    const { plaintext, prefix, hash } = generateApiKey();
    expect(plaintext.startsWith("cfk_")).toBe(true);
    expect(prefix.length).toBe(12);
    expect(plaintext.startsWith(prefix)).toBe(true);
    expect(hash).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
    expect(hashKey(plaintext)).toBe(hash);
  });

  it("produces unique keys", () => {
    expect(generateApiKey().plaintext).not.toBe(generateApiKey().plaintext);
  });

  it("hashKey is deterministic and one-way (not the plaintext)", () => {
    const h = hashKey("cfk_example");
    expect(h).toBe(hashKey("cfk_example"));
    expect(h).not.toContain("cfk_example");
  });
});
