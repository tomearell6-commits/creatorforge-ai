import { NextResponse } from "next/server";

/** Standard JSON error envelope: { error, code?, details? }. */
export function apiError(message: string, status: number, extra?: { code?: string; details?: unknown }) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

/** Safely parse a JSON request body; returns null on malformed/empty input (never throws). */
export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try { return (await request.json()) as T; } catch { return null; }
}
