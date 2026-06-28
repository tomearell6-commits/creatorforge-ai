import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * A single ticket thread (Phase 7 — Module 8).
 * GET   -> ticket + ordered messages.
 * POST  -> add a reply (user side; staff replies come from the admin portal).
 * PATCH -> update status (e.g. user closes/reopens).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: ticket } = await supabase.from("support_tickets").select("*").eq("id", id).single();
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: messages } = await supabase
    .from("support_messages")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });
  return NextResponse.json({ ticket, messages: messages ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, attachments } = await request.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      ticket_id: id,
      user_id: user.id,
      is_staff: false,
      body: message.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("support_tickets").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ message: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await request.json();
  const { data, error } = await supabase
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}
