import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { optimize } from "@/lib/ai/optimize";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { apiError, readJsonBody } from "@/lib/api/respond";

/**
 * AI Content Optimizer (Phase 6 — Module 4).
 * POST { title, category?, script? } -> publishing metadata for review/edit.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "optimize", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const body = await readJsonBody<{ title?: string; category?: string; script?: string }>(request);
  if (!body) return apiError("Invalid JSON body", 400);
  const { title, category, script } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const { result, usedAI } = await optimize({ title: title.trim(), category, script });
  return NextResponse.json({ ...result, usedAI });
}
