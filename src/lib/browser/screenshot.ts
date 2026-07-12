/**
 * Browser Studio — screenshot capture (SERVER-ONLY).
 *
 * Vercel can't run full Chromium, so capture is delegated to a hosted rendering
 * API. Default provider: ScreenshotOne (screenshotone.com) — a simple GET
 * endpoint that returns a PNG. Dormant until SCREENSHOT_API_KEY is set.
 *
 * The provider URL (which carries the secret access key) is only ever fetched
 * server-side by uploadFromUrl — the key never reaches the browser, and the
 * stored image lives in our own Supabase Storage.
 *
 * Env:
 *   SCREENSHOT_API_KEY   — required to enable capture
 *   SCREENSHOT_PROVIDER  — optional ("screenshotone" default)
 */
import "server-only";

export function isScreenshotConfigured(): boolean {
  return !!process.env.SCREENSHOT_API_KEY;
}

export function screenshotProvider(): string {
  return process.env.SCREENSHOT_PROVIDER || "screenshotone";
}

/** Build the provider request URL that returns the PNG for `url`. */
export function buildScreenshotUrl(input: { url: string; fullPage: boolean; width: number }): string {
  const key = process.env.SCREENSHOT_API_KEY!;
  const provider = screenshotProvider();

  if (provider === "screenshotone") {
    const p = new URLSearchParams({
      access_key: key,
      url: input.url,
      format: "png",
      viewport_width: String(input.width),
      device_scale_factor: "1",
      block_ads: "true",
      block_cookie_banners: "true",
      block_trackers: "true",
      cache: "true",
      cache_ttl: "86400",
    });
    if (input.fullPage) p.set("full_page", "true");
    return `https://api.screenshotone.com/take?${p.toString()}`;
  }

  if (provider === "apiflash") {
    const p = new URLSearchParams({
      access_key: key,
      url: input.url,
      format: "png",
      width: String(input.width),
      full_page: input.fullPage ? "true" : "false",
      response_type: "image",
    });
    return `https://api.apiflash.com/v1/urltoimage?${p.toString()}`;
  }

  // urlbox (path-style) — provider set explicitly
  const p = new URLSearchParams({ url: input.url, format: "png", width: String(input.width), full_page: String(input.fullPage) });
  return `https://api.urlbox.io/v1/${key}/png?${p.toString()}`;
}
