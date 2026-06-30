import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planAllowsAutopilotFull } from "@/lib/plan";

/** GET — the user's campaigns. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("autopilot_campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ campaigns: data ?? [] });
}

/** POST — create a campaign (from the wizard). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!b.name || typeof b.name !== "string") return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });

  // Free Trial: Full Autopilot (auto-publishing) is a paid feature — coerce to Assisted.
  let mode = (b.mode as string) ?? "manual";
  let note: string | undefined;
  if (mode === "full" && !planAllowsAutopilotFull(await getUserPlan(supabase))) {
    mode = "assisted";
    note = "Full Autopilot is a paid feature — your campaign was set to Assisted mode. Upgrade to enable automatic publishing.";
  }

  const { data, error } = await supabase.from("autopilot_campaigns").insert({
    user_id: user.id,
    name: b.name, industry: b.industry ?? null, country: b.country ?? null, language: b.language ?? "en",
    website: b.website ?? null, brand_description: b.brand_description ?? null,
    goals: b.goals ?? [], content_types: b.content_types ?? [], frequency: b.frequency ?? "weekly",
    publish_windows: b.publish_windows ?? ["09:00"], timezone: b.timezone ?? "UTC",
    destinations: b.destinations ?? [], mode, status: "active",
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data!.id, note });
}

/** PATCH — update a campaign (mode, status, fields). */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown> & { id?: string };
  if (!b.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  // Free Trial can't switch a campaign to Full Autopilot.
  if (b.mode === "full" && !planAllowsAutopilotFull(await getUserPlan(supabase))) {
    return NextResponse.json({ error: "Full Autopilot is a paid feature. Upgrade to enable automatic publishing.", code: "upgrade_required" }, { status: 403 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["name", "industry", "country", "language", "website", "brand_description", "goals", "content_types", "frequency", "publish_windows", "timezone", "destinations", "mode", "status"]) {
    if (b[k] !== undefined) patch[k] = b[k];
  }
  const { error } = await supabase.from("autopilot_campaigns").update(patch).eq("id", b.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** DELETE ?id= — remove a campaign (cascades jobs/rules). */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await supabase.from("autopilot_campaigns").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
