import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logBizActivity } from "@/lib/business/reports";

/**
 * Business Ops settings: automation mode + public form key + digest toggle.
 * Autopilot requires an explicit acknowledgement flag from the client and is
 * stamped (autopilot_acknowledged_at) — the audit trail records the opt-in.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  let { data: settings } = await admin
    .from("business_ops_settings").select("*").eq("user_id", user.id).maybeSingle();
  if (!settings) {
    const { data: created } = await admin
      .from("business_ops_settings").insert({ user_id: user.id }).select("*").single();
    settings = created;
  }
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (["manual", "assisted", "autopilot"].includes(body.automation_mode)) {
    if (body.automation_mode === "autopilot") {
      if (body.acknowledge !== true) {
        return NextResponse.json(
          { error: "Autopilot requires explicit acknowledgement of its limits.", code: "ACK_REQUIRED" },
          { status: 400 }
        );
      }
      patch.autopilot_acknowledged_at = new Date().toISOString();
    }
    patch.automation_mode = body.automation_mode;
  }
  if (typeof body.daily_digest === "boolean") patch.daily_digest = body.daily_digest;

  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("business_ops_settings")
    .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (patch.automation_mode) {
    await logBizActivity(user.id, "settings.mode_changed", String(patch.automation_mode));
  }
  return NextResponse.json({ settings: updated });
}
