import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { logUsage } from "@/lib/leads/access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_PROFILE = {
  sender_name: "",
  business_name: "",
  business_website: "",
  business_email: "",
  business_address: "",
  reply_to_email: "",
  unsubscribe_footer: "",
  compliance_confirmed: false,
  completed: false,
};

/** GET /api/leads/sender-profile — the user's sender profile, or empty defaults. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase.from("lead_sender_profiles").select("*").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ profile: data ?? { ...EMPTY_PROFILE, user_id: user.id } });
}

/** PUT /api/leads/sender-profile — upsert the user's sender profile. */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "lead-sender-profile", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const senderName = str(body.sender_name);
  const businessName = str(body.business_name);
  const businessWebsite = str(body.business_website);
  const businessEmail = str(body.business_email);
  const businessAddress = str(body.business_address);
  const replyToEmail = str(body.reply_to_email);
  const unsubscribeFooter = str(body.unsubscribe_footer);
  const complianceConfirmed = body.compliance_confirmed === true;

  if (businessEmail && !EMAIL_RE.test(businessEmail))
    return NextResponse.json({ error: "Business email is not a valid email address." }, { status: 400 });
  if (replyToEmail && !EMAIL_RE.test(replyToEmail))
    return NextResponse.json({ error: "Reply-to email is not a valid email address." }, { status: 400 });

  const completed = !!(senderName && businessName && businessEmail && replyToEmail && complianceConfirmed);

  const { data, error } = await supabase
    .from("lead_sender_profiles")
    .upsert(
      {
        user_id: user.id,
        sender_name: senderName || null,
        business_name: businessName || null,
        business_website: businessWebsite || null,
        business_email: businessEmail || null,
        business_address: businessAddress || null,
        reply_to_email: replyToEmail || null,
        unsubscribe_footer: unsubscribeFooter || null,
        compliance_confirmed: complianceConfirmed,
        completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logUsage(supabase, user.id, "sender_profile_update", completed ? "completed" : "incomplete");
  return NextResponse.json({ profile: data });
}
