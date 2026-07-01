import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync, rateLimitAsync } from "@/lib/security/ratelimit";
import { logSecurityEvent } from "@/lib/security/events";

const GENERIC = { ok: true, message: "If this email exists, a reset link has been sent." };

/**
 * POST /api/auth/forgot-password  { email }
 * Sends a Supabase recovery email. ALWAYS returns the same generic response so
 * we never reveal whether an account exists. Rate-limited per IP and per email.
 */
export async function POST(request: Request) {
  // Per-IP limit (5 / 15 min) — blunt abuse control.
  const ipLimit = await limitRequestAsync(request, "forgot-password", 5, 15 * 60_000);
  if (!ipLimit.ok) return NextResponse.json(GENERIC); // stay generic even when limited

  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  const clean = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!clean || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return NextResponse.json(GENERIC);

  // Per-email limit (3 / 15 min) — don't let one inbox be spammed.
  const emailLimit = await rateLimitAsync(`forgot-password-email:${clean}`, { limit: 3, windowMs: 15 * 60_000 });
  if (!emailLimit.ok) return NextResponse.json(GENERIC);

  const origin = new URL(request.url).origin;
  const supabase = await createClient();
  // resetPasswordForEmail does not error on unknown addresses; we ignore the
  // result entirely and never branch on it, preserving non-enumeration.
  await supabase.auth.resetPasswordForEmail(clean, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  }).catch(() => {});

  await logSecurityEvent({
    eventType: "PASSWORD_RESET_REQUESTED",
    req: request,
    metadata: { email_domain: clean.split("@")[1] ?? null },
  });

  return NextResponse.json(GENERIC);
}
