import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
let row: Record<string, unknown> | null = null;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }) }) }),
}));
let allowed = true;
vi.mock("@/lib/security/ratelimit", () => ({ limitRequestAsync: async () => ({ ok: allowed }) }));

import { authenticatePull } from "./auth";
import { generatePullToken, hashPullToken } from "./token";

const SITE = "11111111-2222-3333-4444-555555555555";
const req = (token?: string) => new Request("https://x.example/api/wp-pull/x/next", { headers: token ? { authorization: `Bearer ${token}` } : {} });
let token = "";

beforeEach(() => {
  token = generatePullToken();
  row = { id: SITE, user_id: "u1", site_name: "Natures", site_url: "https://nat.example", delivery: "pull", pull_token_hash: hashPullToken(token) };
  allowed = true;
});

describe("authenticatePull", () => {
  it("accepts the right site with the right secret", async () => {
    const r = await authenticatePull(req(token), SITE, "t", 60);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.site).toMatchObject({ id: SITE, user_id: "u1", site_name: "Natures" });
  });
  it("answers 404 (and nothing more) for a wrong secret, no secret, a malformed id, an unknown site, or a site not using pull delivery", async () => {
    const cases: [string, Request, string][] = [
      ["wrong secret", req(generatePullToken()), SITE],
      ["no secret", req(), SITE],
      ["bad id", req(token), "../../etc"],
    ];
    for (const [name, rq, id] of cases) {
      const r = await authenticatePull(rq, id, "t", 60);
      expect(r.ok, name).toBe(false);
      if (!r.ok) expect(r.res.status, name).toBe(404);
    }
    row = null;
    const unknown = await authenticatePull(req(token), SITE, "t", 60);
    expect(!unknown.ok && unknown.res.status).toBe(404);
    row = { id: SITE, user_id: "u1", site_name: "N", site_url: "https://n", delivery: "push", pull_token_hash: hashPullToken(token) };
    const push = await authenticatePull(req(token), SITE, "t", 60);
    expect(!push.ok && push.res.status).toBe(404);
  });
  it("is rate limited", async () => {
    allowed = false;
    const r = await authenticatePull(req(token), SITE, "t", 60);
    expect(!r.ok && r.res.status).toBe(429);
  });
});
