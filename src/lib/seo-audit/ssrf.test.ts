import { describe, it, expect, vi } from "vitest";

// ssrf.ts imports "server-only", which isn't installed for the test env.
vi.mock("server-only", () => ({}));

import { validateAuditUrl } from "./ssrf";

// NOTE: validateAuditUrl only performs a DNS lookup for non-IP hostnames. Every
// case below uses a literal IP (or is rejected before the DNS step) so these
// tests are fully offline/deterministic.

describe("validateAuditUrl — protocol & port", () => {
  it("rejects non-http(s) protocols", async () => {
    const r = await validateAuditUrl("ftp://8.8.8.8/");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/http/i);
  });

  it("rejects a malformed URL", async () => {
    const r = await validateAuditUrl("not a url");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/valid URL/i);
  });

  it("rejects a disallowed port", async () => {
    const r = await validateAuditUrl("http://8.8.8.8:9999/");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/port/i);
  });

  it("accepts an allowed non-standard port (8080)", async () => {
    const r = await validateAuditUrl("http://8.8.8.8:8080/");
    expect(r.ok).toBe(true);
  });
});

describe("validateAuditUrl — hostname allow", () => {
  it("accepts a normal public literal IPv4 on the default port", async () => {
    const r = await validateAuditUrl("https://8.8.8.8/some/path");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url.hostname).toBe("8.8.8.8");
  });

  it("accepts a public IPv4 on port 443", async () => {
    const r = await validateAuditUrl("https://1.1.1.1:443/");
    expect(r.ok).toBe(true);
  });
});

describe("validateAuditUrl — local/special hostnames", () => {
  it.each(["http://localhost/", "http://foo.local/", "http://api.internal/"])(
    "rejects %s",
    async (input) => {
      const r = await validateAuditUrl(input);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/private|local/i);
    },
  );
});

describe("validateAuditUrl — private / reserved literal IPv4", () => {
  it.each([
    "http://10.0.0.5/",
    "http://127.0.0.1/",
    "http://169.254.1.1/",
    "http://192.168.1.1/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://100.64.0.1/", // CGNAT
    "http://224.0.0.1/", // multicast
    "http://0.0.0.0/",
  ])("rejects %s", async (input) => {
    const r = await validateAuditUrl(input);
    expect(r.ok).toBe(false);
  });

  it("accepts a literal IPv4 just outside the 172.16/12 range (172.15.x)", async () => {
    const r = await validateAuditUrl("http://172.15.0.1/");
    expect(r.ok).toBe(true);
  });

  it("accepts a literal IPv4 just outside the 172.16/12 range (172.32.x)", async () => {
    const r = await validateAuditUrl("http://172.32.0.1/");
    expect(r.ok).toBe(true);
  });
});

describe("validateAuditUrl — private / loopback IPv6", () => {
  it("rejects ::1 (loopback)", async () => {
    const r = await validateAuditUrl("http://[::1]/");
    expect(r.ok).toBe(false);
  });

  it.each(["http://[fc00::1]/", "http://[fd00::1]/", "http://[fe80::1]/"])(
    "rejects unique-local / link-local %s",
    async (input) => {
      const r = await validateAuditUrl(input);
      expect(r.ok).toBe(false);
    },
  );

  it("accepts a public literal IPv6", async () => {
    const r = await validateAuditUrl("http://[2606:4700:4700::1111]/");
    expect(r.ok).toBe(true);
  });
});
