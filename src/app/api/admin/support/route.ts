import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/**
 * Admin support management (Phase 7 — Module 8).
 * GET   -> all tickets (newest first).
 * POST  { ticketId, message } -> staff reply.
 * PATCH { ticketId, status } -> set ticket status.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const { data, error } = await admin
    .from("support_tickets")
    .select("*, support_messages(id, body, is_staff, created_at)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const { ticketId, message } = await request.json();
  if (!ticketId || !message?.trim()) return NextResponse.json({ error: "ticketId and message required" }, { status: 400 });

  const { error } = await admin.from("support_messages").insert({
    ticket_id: ticketId, user_id: user.id, is_staff: true, body: message.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from("support_tickets").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", ticketId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const { ticketId, status } = await request.json();
  const { data, error } = await admin
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}
