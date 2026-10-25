import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.fn();
vi.mock("@/lib/http", () => ({ fetchWithTimeout: (...a: unknown[]) => http(...a) }));

const res = (status: number, body: unknown) => ({ ok: status < 300, status, text: async () => JSON.stringify(body), json: async () => body });
const missing = (m: string) => res(400, { error: { message: `The model '${m}' does not exist.`, code: "invalid_value" } });
const image = () => res(200, { data: [{ b64_json: Buffer.from("img").toString("base64") }] });
const sentModels = () => http.mock.calls.map((c) => JSON.parse(String((c[1] as { body: string }).body)).model);
const load = async () => { vi.resetModules(); return import("./image"); };
const input = { prompt: "boxes", width: 1536, height: 1024 };

beforeEach(() => { http.mockReset(); process.env.OPENAI_API_KEY = "test-key"; delete process.env.OPENAI_IMAGE_MODEL; });

describe("isModelMissingError", () => {
  it("recognises OpenAI's retired-model answer, and nothing else", async () => {
    const { isModelMissingError } = await load();
    expect(isModelMissingError(400, "The model 'gpt-image-1' does not exist.")).toBe(true);
    expect(isModelMissingError(404, '{"error":{"code":"model_not_found"}}')).toBe(true);
    expect(isModelMissingError(400, "Your request was rejected by the safety system")).toBe(false);
    expect(isModelMissingError(401, "does not exist")).toBe(false);
    expect(isModelMissingError(429, "rate limit")).toBe(false);
  });
});

describe("OpenAI image provider", () => {
  it("uses gpt-image-2 first", async () => {
    const { getOpenAIImageProvider } = await load();
    http.mockResolvedValueOnce(image());
    const out = await getOpenAIImageProvider().generate(input);
    expect(sentModels()).toEqual(["gpt-image-2"]);
    expect(out.data.length).toBeGreaterThan(0);
  });
  it("moves to the next model when one has been retired, then remembers the one that worked", async () => {
    process.env.OPENAI_IMAGE_MODEL = "gpt-image-1";
    const { getOpenAIImageProvider } = await load();
    http.mockResolvedValueOnce(missing("gpt-image-1")).mockResolvedValueOnce(image());
    await getOpenAIImageProvider().generate(input);
    expect(sentModels()).toEqual(["gpt-image-1", "gpt-image-2"]);
    http.mockReset(); http.mockResolvedValueOnce(image());
    await getOpenAIImageProvider().generate(input);
    expect(sentModels()).toEqual(["gpt-image-2"]);
  });
  it("does not try other models for a real failure such as a rejected prompt", async () => {
    const { getOpenAIImageProvider } = await load();
    http.mockResolvedValueOnce(res(400, { error: { message: "Your request was rejected by the safety system." } }));
    await expect(getOpenAIImageProvider().generate(input)).rejects.toThrow(/safety/);
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("reports the last failure when every model is gone", async () => {
    const { getOpenAIImageProvider, OPENAI_IMAGE_MODELS } = await load();
    for (const m of OPENAI_IMAGE_MODELS) http.mockResolvedValueOnce(missing(m));
    await expect(getOpenAIImageProvider().generate(input)).rejects.toThrow(/does not exist/);
    expect(http).toHaveBeenCalledTimes(OPENAI_IMAGE_MODELS.length);
  });
});
