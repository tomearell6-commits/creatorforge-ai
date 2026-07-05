import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logBizActivity } from "@/lib/business/reports";

/**
 * Reply lifecycle: approve / edit / reject / mark-sent.
 * "mark-sent" records that the OWNER sent the reply through their own channel
 * (email client, WhatsApp, phone). The platform itself never emails customers
 * from this module — honesty rule: we don't claim sending we can't do.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { replyId, action, text } = await req.json().catch(() => ({}));
  if (typeof replyId !== "string" || !["approve", "edit", "reject", "mark-sent"].includes(action)) {
    return NextResponse.json({ error: "replyId and a valid action are required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: reply } = await admin
    .from("inquiry_replies").select("id, inquiry_id, status").eq("id", replyId).eq("user_id", user.id).maybeSingle();
  if (!reply) return NextResponse.json({ error: "Reply not found." }, { status: 404 });

  if (action === "edit") {
    if (typeof text !== "string" || !text.trim()) return NextResponse.json({ error: "Provide the edited text." }, { status: 400 });
    await admin.from("inquiry_replies").update({ draft_text: text.slice(0, 8000) }).eq("id", reply.id);
  } else if (action === "approve") {
    await admin.from("inquiry_replies").update({ status: "approved" }).eq("id", reply.id);
  } else if (action === "reject") {
    await admin.from("inquiry_replies").update({ status: "rejected" }).eq("id", reply.id);
  } else if (action === "mark-sent") {
    await admin.from("inquiry_replies").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", reply.id);
    await admin.from("business_inquiries").update({ status: "replied", updated_at: new Date().toISOString() }).eq("id", reply.inquiry_id);
  }

  await logBizActivity(user.id, `reply.${action}`, undefined, { replyId });
  return NextResponse.json({ ok: true });
}
