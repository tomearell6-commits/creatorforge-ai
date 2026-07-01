/**
 * HTTP helpers with a hard timeout.
 *
 * `fetchWithTimeout` wraps the global `fetch` with an `AbortController` so that
 * no external call can hang forever (a stalled upstream would otherwise tie up a
 * serverless function until the platform kills it). On timeout the underlying
 * fetch rejects with an `AbortError`, which callers should treat like any other
 * network failure. A caller-supplied `init.signal` takes precedence over the
 * internal timeout signal. No external dependencies.
 */
export async function fetchWithTimeout(
  url: string | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: init.signal ?? ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
