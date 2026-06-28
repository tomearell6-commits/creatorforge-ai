/**
 * Workspace role helpers (Phase 6). Resolves a user's role within a workspace
 * and gates capabilities via ROLE_CAN. Owner of the workspace always has full
 * rights even without an explicit member row.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceRole } from "@/lib/types";
import { ROLE_CAN } from "@/lib/constants";

export async function getUserRole(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (ws?.owner_id === userId) return "owner";

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (member && member.status === "active") return member.role as WorkspaceRole;
  return null;
}

export async function can(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  capability: keyof (typeof ROLE_CAN)["owner"]
): Promise<boolean> {
  const role = await getUserRole(supabase, workspaceId, userId);
  if (!role) return false;
  return ROLE_CAN[role][capability];
}
