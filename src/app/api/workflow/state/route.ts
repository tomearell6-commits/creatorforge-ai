/**
 * Workflow state — GET (single project or recent list) / POST (upsert).
 * Owner-scoped via RLS. Free (no credits). Auto-saves progress.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertWorkflowState, getWorkflowState, listActiveWorkflows, type WorkflowStateInput } from "@/lib/workflow/state";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectType = searchParams.get("projectType");
  const projectId = searchParams.get("projectId");
  if (projectType && projectId) {
    const state = await getWorkflowState(supabase, projectType, projectId);
    return NextResponse.json({ state });
  }
  const active = await listActiveWorkflows(supabase);
  return NextResponse.json({ active });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as WorkflowStateInput;
  if (!body.projectType || !body.projectId) {
    return NextResponse.json({ error: "projectType and projectId are required." }, { status: 400 });
  }
  const state = await upsertWorkflowState(supabase, user.id, body);
  if (!state) return NextResponse.json({ error: "Could not save workflow state." }, { status: 500 });
  return NextResponse.json({ state });
}
