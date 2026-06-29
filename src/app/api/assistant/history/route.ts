import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/assistant/history[?conversationId=]
 *  - with conversationId: messages for that conversation (owner-only).
 *  - without: the user's recent conversations.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversationId = new URL(request.url).searchParams.get("conversationId");

  if (conversationId) {
    const { data: conv } = await supabase.from("assistant_conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { data: messages } = await supabase.from("assistant_messages")
      .select("id, role, message, credit_cost, status, created_at")
      .eq("conversation_id", conversationId).eq("user_id", user.id)
      .order("created_at", { ascending: true });
    return NextResponse.json({ messages: messages ?? [] });
  }

  const { data: conversations } = await supabase.from("assistant_conversations")
    .select("id, title, updated_at").eq("user_id", user.id)
    .order("updated_at", { ascending: false }).limit(20);
  return NextResponse.json({ conversations: conversations ?? [] });
}
