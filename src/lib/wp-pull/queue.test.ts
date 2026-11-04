import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/seo/indexnow", () => ({ notifyIndexNow: vi.fn(async () => ({ status: "submitted", message: "Submitted to Bing and others via IndexNow." })) }));

import { LEASE_MS, MAX_ATTEMPTS, claimNext, completeDelivery, enqueuePull } from "./queue";
import { bearerToken, generatePullToken, hashPullToken, tokenMatches } from "./token";

/* ───────── a tiny in-memory stand-in for the Supabase client (only what queue.ts uses) ───────── */
type Row = Record<string, unknown>;
function fakeAdmin(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = { wp_pull_queue: [], seo_articles: [], seo_autopost_log: [], seo_autopost_sites: [], wordpress_publish_history: [], ...seed };
  const rpcCalls: { fn: string; args: Row }[] = [];
  let idn = 0;
  const from = (name: string) => {
    const rows = (tables[name] ??= []);
    let mode: "select" | "update" | "insert" = "select";
    let patch: Row = {}; let inserted: Row | null = null;
    const filters: ((r: Row) => boolean)[] = [];
    let ord: { col: string; asc: boolean } | null = null; let lim = Infinity;
    const run = () => {
      // the database fills in these defaults (see migration 0056)
      if (mode === "insert") { const r = { id: `id-${++idn}`, ...(name === "wp_pull_queue" ? { status: "pending", attempts: 0, created_at: new Date().toISOString() } : {}), ...inserted! }; rows.push(r); return [r]; }
      let out = rows.filter((r) => filters.every((f) => f(r)));
      if (ord) out = [...out].sort((a, b) => (String(a[ord!.col]) < String(b[ord!.col]) ? -1 : 1) * (ord!.asc ? 1 : -1));
      out = out.slice(0, lim);
      if (mode === "update") out.forEach((r) => Object.assign(r, patch));
      return out;
    };
    const b: Record<string, unknown> = {
      select: () => b, eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b), in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), b),
      lt: (c: string, v: string | number) => (filters.push((r) => r[c] != null && (r[c] as string | number) < v), b), gte: (c: string, v: number) => (filters.push((r) => (r[c] as number) >= v), b),
      order: (c: string, o: { ascending: boolean }) => ((ord = { col: c, asc: o.ascending }), b), limit: (n: number) => ((lim = n), b),
      update: (p: Row) => ((mode = "update"), (patch = p), b), insert: (r: Row) => ((mode = "insert"), (inserted = r), b),
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }), single: async () => ({ data: run()[0] ?? null, error: null }),
      then: (res: (v: { data: Row[]; error: null }) => unknown) => Promise.resolve({ data: run(), error: null }).then(res),
    };
    return b;
  };
  return { client: { from, rpc: async (fn: string, args: Row) => { rpcCalls.push({ fn, args }); return { data: 1, error: null }; } } as never, tables, rpcCalls };
}

const payload = { title: "Urea Application Rates", contentHtml: "<p>text</p>", slug: "urea-application-rates", tags: ["urea"], status: "publish" as const };

describe("the plugin's secret", () => {
  it("is long, random, stored only as a hash, and checked in constant time", () => {
    const t = generatePullToken();
    expect(t.startsWith("cfp_")).toBe(true);
    expect(t.length).toBeGreaterThan(40);
    expect(generatePullToken()).not.toBe(t);
    expect(hashPullToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenMatches(t, hashPullToken(t))).toBe(true);
    expect(tokenMatches(t + "x", hashPullToken(t))).toBe(false);
    expect(tokenMatches(t, hashPullToken(generatePullToken()))).toBe(false);
    expect(tokenMatches("", hashPullToken(t))).toBe(false);
    expect(tokenMatches(t, null)).toBe(false);
    expect(tokenMatches("not-a-token", hashPullToken("not-a-token"))).toBe(false);
  });
  it("reads a Bearer header", () => {
    expect(bearerToken("Bearer cfp_abc")).toBe("cfp_abc");
    expect(bearerToken("bearer   cfp_abc ")).toBe("cfp_abc");
    expect(bearerToken("Basic xyz")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});

describe("collecting articles", () => {
  let f: ReturnType<typeof fakeAdmin>;
  beforeEach(() => {
    f = fakeAdmin();
  });

  it("hands out the oldest waiting article once, without the credit amount, and holds it for the plugin", async () => {
    await enqueuePull(f.client, { userId: "u1", wordpressSiteId: "w1", autopostSiteId: "s1", articleId: "a1", payload, charge: 25 });
    await enqueuePull(f.client, { userId: "u1", wordpressSiteId: "w1", autopostSiteId: "s1", articleId: "a2", payload: { ...payload, title: "Second" }, charge: 25 });
    f.tables.wp_pull_queue[0].created_at = "2026-11-04T08:00:00Z"; f.tables.wp_pull_queue[1].created_at = "2026-11-04T09:00:00Z";

    const first = await claimNext(f.client, "w1");
    expect(first?.payload.title).toBe("Urea Application Rates");
    expect(first?.payload).not.toHaveProperty("charge");
    expect(f.tables.wp_pull_queue[0]).toMatchObject({ status: "delivering", attempts: 1 });

    const second = await claimNext(f.client, "w1");
    expect(second?.payload.title).toBe("Second"); // the first is leased, so the next one is offered
    expect(await claimNext(f.client, "w1")).toBeNull(); // both leased
  });

  it("does not offer another website's articles", async () => {
    await enqueuePull(f.client, { userId: "u1", wordpressSiteId: "OTHER", autopostSiteId: null, articleId: "a1", payload, charge: 25 });
    expect(await claimNext(f.client, "w1")).toBeNull();
  });

  it("offers an article again when the plugin collected it but never confirmed, and gives up after the maximum tries", async () => {
    await enqueuePull(f.client, { userId: "u1", wordpressSiteId: "w1", autopostSiteId: null, articleId: "a1", payload, charge: 25 });
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      const got = await claimNext(f.client, "w1");
      expect(got, `attempt ${i}`).not.toBeNull();
      f.tables.wp_pull_queue[0].lease_until = new Date(Date.now() - LEASE_MS).toISOString(); // lease over
    }
    expect(await claimNext(f.client, "w1")).toBeNull();
    expect(f.tables.wp_pull_queue[0].status).toBe("failed");
  });
});

describe("confirming delivery", () => {
  function setup() {
    const f = fakeAdmin({
      seo_articles: [{ id: "a1", status: "publishing" }],
      seo_autopost_sites: [{ id: "s1", posts_published: 4, consecutive_failures: 2 }],
      seo_autopost_log: [{ id: "l1", article_id: "a1", status: "drafted", message: "Queued" }],
    });
    return f;
  }
  const enqueue = async (f: ReturnType<typeof fakeAdmin>) => {
    const id = await enqueuePull(f.client, { userId: "u1", wordpressSiteId: "w1", autopostSiteId: "s1", articleId: "a1", payload, charge: 25 });
    await claimNext(f.client, "w1");
    return id;
  };

  it("publishes, takes the credits ONCE, tells search engines, and turns the activity row into 'published'", async () => {
    const f = setup(); const id = await enqueue(f);
    const r = await completeDelivery(f.client, "w1", id, { ok: true, postId: 99, url: "https://nat.example/urea-application-rates/", status: "publish" });
    expect(r.ok).toBe(true);
    expect(f.tables.wp_pull_queue[0]).toMatchObject({ status: "delivered", post_id: "99" });
    expect(f.tables.seo_articles[0]).toMatchObject({ status: "published", wordpress_post_id: "99" });
    expect(f.tables.seo_autopost_log[0]).toMatchObject({ status: "published", post_url: "https://nat.example/urea-application-rates/", credits_charged: 25 });
    expect(f.tables.seo_autopost_sites[0]).toMatchObject({ posts_published: 5, consecutive_failures: 0 });
    expect(f.rpcCalls).toEqual([{ fn: "wallet_adjust", args: { p_user: "u1", p_amount: -25, p_type: "publishing", p_reason: "seo_autopost_pull" } }]);

    const again = await completeDelivery(f.client, "w1", id, { ok: true, postId: 99, url: "https://nat.example/x/", status: "publish" });
    expect(again.ok).toBe(true);
    expect(f.rpcCalls).toHaveLength(1); // a repeated report never charges twice
    expect(f.tables.seo_autopost_sites[0].posts_published).toBe(5);
  });

  it("does not count or announce a post the site is holding as pending", async () => {
    const f = setup(); const id = await enqueue(f);
    await completeDelivery(f.client, "w1", id, { ok: true, postId: 7, url: "https://nat.example/p/", status: "pending" });
    expect(f.tables.seo_articles[0].status).toBe("draft");
    expect(f.tables.seo_autopost_log[0]).toMatchObject({ status: "drafted", post_url: null });
  });

  it("refuses an unknown article and one that belongs to another website", async () => {
    const f = setup(); const id = await enqueue(f);
    expect((await completeDelivery(f.client, "w1", "nope", { ok: true })).ok).toBe(false);
    expect((await completeDelivery(f.client, "OTHER", id, { ok: true })).ok).toBe(false);
    expect(f.rpcCalls).toHaveLength(0);
  });

  it("puts a failed article back for another try, and only after the maximum gives up, pauses the site at three failures", async () => {
    const f = setup(); const id = await enqueue(f);
    const r1 = await completeDelivery(f.client, "w1", id, { ok: false, error: "disk full" });
    expect(r1.ok).toBe(true);
    expect(f.tables.wp_pull_queue[0]).toMatchObject({ status: "pending", error: "disk full" });
    expect(f.rpcCalls).toHaveLength(0);

    f.tables.wp_pull_queue[0].attempts = MAX_ATTEMPTS;
    f.tables.wp_pull_queue[0].status = "delivering";
    await completeDelivery(f.client, "w1", id, { ok: false, error: "disk full" });
    expect(f.tables.wp_pull_queue[0].status).toBe("failed");
    expect(f.tables.seo_articles[0].status).toBe("failed");
    expect(f.tables.seo_autopost_log[0]).toMatchObject({ status: "failed" });
    expect(f.tables.seo_autopost_sites[0]).toMatchObject({ consecutive_failures: 3, active: false });
    expect(String(f.tables.seo_autopost_sites[0].paused_reason)).toContain("disk full");
    expect(f.rpcCalls).toHaveLength(0); // nothing is charged for a failure
  });
});
