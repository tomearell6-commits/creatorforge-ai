import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/workspace";
import type { WorkspaceRole } from "@/lib/types";

/**
 * Workspace members (Phase 6 — Module 9). Role-gated: only owner/admin may
 * invite, change roles, or remove members (ROLE_CAN.manageMembers).
 * POST   { workspaceId, email, role } -> invite a member.
 * PATCH  { memberId, workspaceId, role } -> change a role.
 * DELETE { memberId, workspaceId } -> remove a member.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, email, role } = await request.json();
  if (!workspaceId || !email) return NextResponse.json({ error: "workspaceId and email required" }, { status: 400 });
  if (!(await can(supabase, workspaceId, user.id, "manageMembers"))) {
    return NextResponse.json({ error: "You don't have permission to manage members" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspaceId,
      invited_email: String(email).toLowerCase(),
      role: (role as WorkspaceRole) ?? "viewer",
      status: "invited",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("activity_logs").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    action: "member.invited",
    target_type: "member",
    metadata: { email, role },
  });
  return NextResponse.json({ member: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId, workspaceId, role } = await request.json();
  if (!(await can(supabase, workspaceId, user.id, "manageMembers"))) {
    return NextResponse.json({ error: "You don't have permission to manage members" }, { status: 403 });
  }
  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("id", memberId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId, workspaceId } = await request.json();
  if (!(await can(supabase, workspaceId, user.id, "manageMembers"))) {
    return NextResponse.json({ error: "You don't have permission to manage members" }, { status: 403 });
  }
  const { error } = await supabase.from("workspace_members").delete().eq("id", memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
