import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";

/**
 * Mark notifications as read (Phase 6 — Module 6).
 * POST { id } -> mark a single notification read (scoped to the user).
 * POST { all: true } -> mark all of the user's notifications read.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "notif-read", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id, all } = (await request.json().catch(() => ({}))) as { id?: string; all?: boolean };

  const patch = { read: true, status: "read", read_at: new Date().toISOString() };
  const base = supabase.from("notifications").update(patch).eq("user_id", user.id);
  const { error } = all ? await base : await base.eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
