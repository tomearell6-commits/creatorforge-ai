import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readJsonWithRetry } from "./analyze";

describe("readJsonWithRetry", () => {
  it("retries when the first answer is broken JSON, then succeeds", async () => {
    const answers = ['{"keywords":[{"keyword":"a" "why":"missing comma"}]}', '```json\n{"ok":true}\n```'];
    const ask = vi.fn(async () => answers.shift() ?? "");
    await expect(readJsonWithRetry<{ ok: boolean }>(ask, 2)).resolves.toEqual({ ok: true });
    expect(ask).toHaveBeenCalledTimes(2);
  });
  it("gives a friendly error after the last try", async () => {
    const ask = vi.fn(async () => "{ broken");
    await expect(readJsonWithRetry(ask, 2)).rejects.toThrow(/no credits were charged/);
    expect(ask).toHaveBeenCalledTimes(2);
  });
  it("does not retry other errors", async () => {
    const ask = vi.fn(async () => { throw new Error("network down"); });
    await expect(readJsonWithRetry(ask, 3)).rejects.toThrow("network down");
    expect(ask).toHaveBeenCalledTimes(1);
  });
});
