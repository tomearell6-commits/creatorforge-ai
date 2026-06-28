/**
 * Structured logging + error monitoring abstraction (Phase 8 — Modules 5 & 6).
 *
 * Emits single-line JSON logs (parseable by any log aggregator) with a category
 * so auth / payments / publishing / rendering / admin events are filterable.
 * `captureError` is the central error sink: it logs structured, and forwards to
 * Sentry when wired (SENTRY_DSN + @sentry/nextjs). Until then it degrades to a
 * structured error log — no behavior change, one integration point.
 */
export type LogCategory =
  | "auth" | "payment" | "credits" | "publishing" | "rendering"
  | "admin" | "api" | "jobs" | "worker" | "support" | "security" | "system";

type Level = "info" | "warn" | "error";

function emit(level: Level, category: LogCategory, message: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, category, message, ...data });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (category: LogCategory, message: string, data?: Record<string, unknown>) => emit("info", category, message, data),
  warn: (category: LogCategory, message: string, data?: Record<string, unknown>) => emit("warn", category, message, data),
  error: (category: LogCategory, message: string, data?: Record<string, unknown>) => emit("error", category, message, data),
};

let sentryReady = false;

/** Forward to Sentry (server-side only, lazily initialized, never throws). */
function forwardToSentry(err: unknown, context?: Record<string, unknown>) {
  if (typeof window !== "undefined" || !process.env.SENTRY_DSN) return;
  void (async () => {
    try {
      const Sentry = await import("@sentry/node");
      if (!sentryReady) {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV,
          tracesSampleRate: 0.1,
        });
        sentryReady = true;
      }
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)), { extra: context });
    } catch {
      /* monitoring must never break the request */
    }
  })();
}

/** Central error capture: structured log + Sentry (when SENTRY_DSN is set). */
export function captureError(err: unknown, context?: { category?: LogCategory; [k: string]: unknown }) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  emit("error", context?.category ?? "system", message, { stack, ...context });
  forwardToSentry(err, context);
}
