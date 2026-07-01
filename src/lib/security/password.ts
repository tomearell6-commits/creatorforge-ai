/**
 * Password policy — shared by the reset page (client) and the change/reset API
 * routes (server). Client-safe: no server-only imports.
 *
 * Rules: min 8 chars, at least one uppercase, one lowercase, one number, one
 * special character.
 */
export type PasswordCheck = { label: string; ok: boolean };

export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "An uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "A lowercase letter", ok: /[a-z]/.test(pw) },
    { label: "A number", ok: /[0-9]/.test(pw) },
    { label: "A special character", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
}

export function validatePassword(pw: string): { ok: boolean; errors: string[] } {
  const checks = passwordChecks(pw);
  const errors = checks.filter((c) => !c.ok).map((c) => c.label);
  return { ok: errors.length === 0, errors };
}

/** 0–4 strength score for the meter (based on satisfied rules + length bonus). */
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  const satisfied = passwordChecks(pw).filter((c) => c.ok).length; // 0–5
  let score = satisfied - 1;                 // require the basics before "weak"
  if (pw.length >= 12 && satisfied === 5) score += 1; // length bonus
  return Math.max(0, Math.min(4, score));
}

export const STRENGTH_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;
