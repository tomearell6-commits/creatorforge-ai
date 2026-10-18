import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Reply = { content: unknown[]; stop_reason?: string };
const replies: (Reply | Error)[] = [];
const calls: { tool_choice?: unknown }[] = [];

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      stream: (args: { tool_choice?: unknown }) => {
        calls.push(args);
        return { finalMessage: async () => { const r = replies.shift() ?? { content: [] }; if (r instanceof Error) throw r; return r; } };
      },
    };
  },
}));

import { askJson } from "./analyze";

const tool = (input: unknown): Reply => ({ content: [{ type: "tool_use", name: "submit_result", input }] });
const text = (t: string): Reply => ({ content: [{ type: "text", text: t }] });

beforeEach(() => {
  replies.length = 0;
  calls.length = 0;
  process.env.ANTHROPIC_API_KEY = "test";
});

describe("askJson (structured result)", () => {
  it("uses a forced tool call and returns the parsed object", async () => {
    replies.push(tool({ plan: [{ day: 1, title: 'A "quoted" title, with, commas' }] }));
    const r = await askJson<{ plan: { title: string }[] }>("sys", "user", 9000);
    expect(r.plan[0].title).toBe('A "quoted" title, with, commas');
    expect(calls[0].tool_choice).toEqual({ type: "tool", name: "submit_result" });
  });
  it("big call: falls back to plain-text JSON when the tool result is empty", async () => {
    replies.push({ content: [] }, text('{"ok":true}'));
    await expect(askJson("sys", "user", 9000)).resolves.toEqual({ ok: true });
  });
  it("small call: tries the tool twice before the text fallback", async () => {
    replies.push({ content: [] }, tool({ name: "x" }));
    await expect(askJson("sys", "user", 2000)).resolves.toEqual({ name: "x" });
    expect(calls.length).toBe(2);
  });
  it("gives a friendly error when nothing usable comes back", async () => {
    replies.push({ content: [] }, text("{ broken"));
    await expect(askJson("sys", "user", 9000)).rejects.toThrow(/no credits were charged/);
  });
});

describe("askJson when the API rejects the tool request", () => {
  it("falls back to plain-text JSON instead of failing", async () => {
    replies.push(Object.assign(new Error("400 invalid request"), { status: 400 }), text('{"ok":1}'));
    await expect(askJson("sys", "user", 9000)).resolves.toEqual({ ok: 1 });
  });
  it("does not hide other API errors (e.g. 401)", async () => {
    replies.push(Object.assign(new Error("401 unauthorized"), { status: 401 }));
    await expect(askJson("sys", "user", 9000)).rejects.toThrow("401");
  });
});
