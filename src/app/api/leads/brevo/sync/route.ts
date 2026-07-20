import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { LEAD_CREDIT_COSTS } from "@/lib/leads/constants";
import { canContact, logCompliance } from "@/lib/leads/compliance";
import { guardLead, logUsage } from "@/lib/leads/access";
import { createContactList, syncLeadsToBrevo, willUseBrevo, type LeadContact } from "@/lib/leads/brevo";

/**
 * POST /api/leads/brevo/sync — sync a lead list's contactable members into Brevo.
 * Body: { listId }. Charges 1 credit per brevoSyncPer contacts (only when Brevo
 * is configured). Suppressed / ineligible leads are filtered via canContact().
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-brevo-sync", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const gate = await guardLead(supabase, user.id, !!user.email_confirmed_at, "send");
  if (gate instanceof NextResponse) return gate;
  await logUsage(supabase, user.id, "sync");

  const { listId } = (await request.json().catch(() => ({}))) as { listId?: string };
  if (!listId) return NextResponse.json({ error: "Missing listId." }, { status: 400 });

  const { data: list } = await supabase.from("lead_lists").select("*").eq("id", listId).eq("user_id", user.id).maybeSingle();
  if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });

  const { data: members } = await supabase.from("lead_list_members")
    .select("leads:lead_id ( id, email, business_name, lead_status, do_not_contact, verification_status )")
    .eq("user_id", user.id).eq("list_id", listId);

  const contacts: LeadContact[] = [];
  const leadIds: string[] = [];
  type JoinedLead = { id: string; email: string | null; business_name: string | null; lead_status: string | null; do_not_contact: boolean | null; verification_status: string | null };
  for (const m of members ?? []) {
    const raw = (m as unknown as { leads: JoinedLead | JoinedLead[] | null }).leads;
    const lead = Array.isArray(raw) ? raw[0] ?? null : raw;
    if (!lead) continue;
    if (!canContact(lead).ok) continue;
    contacts.push({ email: lead.email!, business_name: lead.business_name });
    leadIds.push(lead.id);
  }

  if (contacts.length === 0) return NextResponse.json({ error: "No contactable leads." }, { status: 400 });

  // H1/L2: reuse this list's existing Brevo list; create one only once, and
  // persist the id on OUR record so create-campaign never trusts a client id.
  let brevoListId = (list.brevo_list_id as number | null) ?? null;
  if (!brevoListId) {
    const created = await createContactList(list.name as string);
    if (!created.configured) return NextResponse.json({ configured: false });
    if (created.error || created.listId == null) return NextResponse.json({ configured: true, error: created.error ?? "brevo_list_failed" }, { status: 502 });
    brevoListId = created.listId;
    await supabase.from("lead_lists").update({ brevo_list_id: brevoListId }).eq("id", listId).eq("user_id", user.id);
  }

  const bill = willUseBrevo();
  const cost = Math.ceil(contacts.length / LEAD_CREDIT_COSTS.brevoSyncPer);
  if (bill && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits to sync.", code: "insufficient_credits" }, { status: 402 });
  }

  const result = await syncLeadsToBrevo(brevoListId, contacts);
  if (!result.configured) return NextResponse.json({ configured: false });

  if (bill && result.synced > 0) {
    const charge = Math.ceil(result.synced / LEAD_CREDIT_COSTS.brevoSyncPer);
    await deductCredits(charge, "lead_brevo_sync");
  }

  await supabase.from("leads").update({ lead_status: "synced", updated_at: new Date().toISOString() })
    .eq("user_id", user.id).in("id", leadIds);
  await logCompliance(supabase, user.id, "sync", `list ${listId}: ${result.synced} contacts → brevo list ${brevoListId}`);

  return NextResponse.json({ configured: true, synced: result.synced, brevoListId: brevoListId });
}
