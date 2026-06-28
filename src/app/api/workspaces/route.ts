import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Workspaces (Phase 6 — Module 9).
 * GET  -> workspaces the user owns or belongs to, with members + recent activity.
 * POST -> create a workspace (caller becomes owner + an active owner member).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS returns only workspaces the user owns or is a member of.
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("*, workspace_members(*)")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: activity } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ workspaces: workspaces ?? [], activity: activity ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  const { data: ws, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: user.id, name: name?.trim() || "My Workspace" })
    .select("*")
    .single();
  if (error || !ws) return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });

  await supabase.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });
  await supabase.from("activity_logs").insert({
    workspace_id: ws.id,
    user_id: user.id,
    action: "workspace.created",
    target_type: "workspace",
    target_id: ws.id,
  });

  return NextResponse.json({ workspace: ws });
}
