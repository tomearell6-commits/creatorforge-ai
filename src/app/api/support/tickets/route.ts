import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Support Center (Phase 7 — Module 8).
 * GET  -> the user's tickets (newest first).
 * POST -> open a ticket + its first message.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*, support_messages(count)")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, message, priority, category, attachments } = await request.json();
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      subject: subject.trim(),
      priority: priority ?? "normal",
      category: category ?? null,
      status: "open",
    })
    .select("*")
    .single();
  if (error || !ticket) return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });

  await supabase.from("support_messages").insert({
    ticket_id: ticket.id,
    user_id: user.id,
    is_staff: false,
    body: message.trim(),
    attachments: Array.isArray(attachments) ? attachments : [],
  });

  return NextResponse.json({ ticket });
}
