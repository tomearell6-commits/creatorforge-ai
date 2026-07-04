import { describe, it, expect, beforeAll } from "vitest";
import {
  issueTwoFactorCookie,
  verifyTwoFactorCookie,
  issueOffMarker,
  verifyOffMarker,
  issueActionToken,
  verifyActionToken,
  twoFactorCookieAvailable,
} from "./twofactor-cookie";

const USER = "11111111-2222-3333-4444-555555555555";

beforeAll(() => {
  process.env.SECRETS_KEY = "test-secret-key-for-2fa-cookie";
});

describe("2FA verification cookie", () => {
  it("issues and verifies for the same user", async () => {
    expect(twoFactorCookieAvailable()).toBe(true);
    const c = await issueTwoFactorCookie(USER);
    expect(c).toBeTruthy();
    expect(await verifyTwoFactorCookie(c!, USER)).toBe(true);
  });
  it("rejects a different user", async () => {
    const c = await issueTwoFactorCookie(USER);
    expect(await verifyTwoFactorCookie(c!, "99999999-8888-7777-6666-555555555555")).toBe(false);
  });
  it("rejects tampered payloads and signatures", async () => {
    const c = (await issueTwoFactorCookie(USER))!;
    const parts = c.split(".");
    const future = `v1.${USER}.${parseInt(parts[2], 10) + 9999}.${parts[3]}`;
    expect(await verifyTwoFactorCookie(future, USER)).toBe(false);
    expect(await verifyTwoFactorCookie(c.slice(0, -2) + "xx", USER)).toBe(false);
    expect(await verifyTwoFactorCookie("garbage", USER)).toBe(false);
    expect(await verifyTwoFactorCookie(undefined, USER)).toBe(false);
  });
  it("an off-marker never satisfies the verified check (and vice versa)", async () => {
    const off = (await issueOffMarker(USER))!;
    expect(await verifyOffMarker(off, USER)).toBe(true);
    expect(await verifyTwoFactorCookie(off, USER)).toBe(false);
    const ok = (await issueTwoFactorCookie(USER))!;
    expect(await verifyOffMarker(ok, USER)).toBe(false);
  });
});

describe("high-risk action token", () => {
  it("issues, verifies, and is user-bound", async () => {
    const t = (await issueActionToken(USER))!;
    expect(await verifyActionToken(t, USER)).toBe(true);
    expect(await verifyActionToken(t, "99999999-8888-7777-6666-555555555555")).toBe(false);
  });
  it("a login cookie can never satisfy an action check", async () => {
    const c = (await issueTwoFactorCookie(USER))!;
    expect(await verifyActionToken(c, USER)).toBe(false);
  });
});
