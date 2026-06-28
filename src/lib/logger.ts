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

/** Central error capture. Forward to Sentry here once @sentry/nextjs is installed. */
export function captureError(err: unknown, context?: { category?: LogCategory; [k: string]: unknown }) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  emit("error", context?.category ?? "system", message, { stack, ...context });
  // if (process.env.SENTRY_DSN) Sentry.captureException(err, { extra: context });
}
