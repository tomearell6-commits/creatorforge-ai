import { afterEach, describe, expect, it, vi } from "vitest";
// wordpress.ts reaches ssrf.ts (via IndexNow), which imports "server-only" (not installed for tests).
vi.mock("server-only", () => ({}));
import { checkWordPressAuth } from "./wordpress";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const html = (status: number) => new Response("<html><title>403 Forbidden</title></html>", { status });

/** Build a fetch that answers by path, like a real WordPress site would. */
function site(handlers: Record<string, () => Response>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const u = String(input);
    for (const key of Object.keys(handlers)) if (u.includes(key)) return handlers[key]();
    return json(404, { code: "rest_no_route" });
  });
}

describe("checkWordPressAuth", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("accepts a correct login when the /users page is blocked by a firewall (the real-world case)", async () => {
    vi.stubGlobal("fetch", site({
      "/users/me": () => html(403),                       // host hides the users endpoint
      "/posts?context=edit": () => json(200, []),         // admin-only page works with a valid login
    }));
    expect(await checkWordPressAuth("https://x.com", "Basic abc")).toEqual({ ok: true });
  });

  it("accepts a normal site where /users/me works", async () => {
    vi.stubGlobal("fetch", site({ "/users/me": () => json(200, { name: "Admin" }) }));
    expect((await checkWordPressAuth("https://x.com", "Basic abc")).ok).toBe(true);
  });

  it("reports a wrong application password clearly (not as a firewall block)", async () => {
    vi.stubGlobal("fetch", site({
      "/users/me": () => html(403),
      "/posts?context=edit": () => json(401, { code: "incorrect_password", message: "invalid application password" }),
    }));
    const r = await checkWordPressAuth("https://x.com", "Basic abc");
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.kind).toBe("bad_login"); expect(r.message).toMatch(/password is wrong|revoked/i); }
  });

  it("reports an unknown username clearly", async () => {
    vi.stubGlobal("fetch", site({ "/users/me": () => json(401, { code: "invalid_username" }) }));
    const r = await checkWordPressAuth("https://x.com", "Basic abc");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/username/i);
  });

  it("explains a firewall that blocks every admin page", async () => {
    vi.stubGlobal("fetch", site({ "/users/me": () => html(403), "/posts?context=edit": () => html(403), "/settings": () => html(406) }));
    const r = await checkWordPressAuth("https://x.com", "Basic abc");
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.kind).toBe("blocked"); expect(r.message).toMatch(/firewall|security/i); }
  });

  it("explains a host that removes the login header or a user without permission", async () => {
    vi.stubGlobal("fetch", site({
      "/users/me": () => json(401, { code: "rest_not_logged_in" }),
      "/posts?context=edit": () => json(401, { code: "rest_forbidden_context" }),
      "/settings": () => json(401, { code: "rest_forbidden" }),
    }));
    const r = await checkWordPressAuth("https://x.com", "Basic abc");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Administrator or Editor|header/i);
  });

  it("reports an unreachable site", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ENOTFOUND")));
    const r = await checkWordPressAuth("https://nope.example", "Basic abc");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("unreachable");
  });
});
