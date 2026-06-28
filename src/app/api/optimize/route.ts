import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { optimize } from "@/lib/ai/optimize";
import { limitRequest } from "@/lib/security/ratelimit";

/**
 * AI Content Optimizer (Phase 6 — Module 4).
 * POST { title, category?, script? } -> publishing metadata for review/edit.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = limitRequest(request, "optimize", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const { title, category, script } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const { result, usedAI } = await optimize({ title: title.trim(), category, script });
  return NextResponse.json({ ...result, usedAI });
}
