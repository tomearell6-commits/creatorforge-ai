import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /api/assistant/feedback { messageId?, conversationId?, rating: up|down, comment? } */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as { messageId?: string; conversationId?: string; rating?: string; comment?: string };
  if (b.rating !== "up" && b.rating !== "down") return NextResponse.json({ error: "rating must be up or down." }, { status: 400 });

  const { error } = await supabase.from("assistant_feedback").insert({
    user_id: user.id, message_id: b.messageId ?? null, conversation_id: b.conversationId ?? null,
    rating: b.rating, comment: (b.comment ?? "").slice(0, 1000) || null,
  });
  if (error) return NextResponse.json({ error: "Could not save feedback." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
