import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { LEAD_CREDIT_COSTS } from "@/lib/leads/constants";
import { logCompliance, safeSourceUrl } from "@/lib/leads/compliance";
import {
  crawlSourceUrl, findContactPages, extractBusinessData, normalizeLeadData,
  removeDuplicates, storeLeadSource, willUseFirecrawl, type RawLead,
} from "@/lib/leads/firecrawl";
import { verifySingleEmail, updateVerificationStatus, willUseNeverBounce } from "@/lib/leads/neverbounce";

/**
 * POST /api/leads/campaigns/run — the lead pipeline.
 * Crawls each PUBLIC source URL (Firecrawl honors robots.txt), extracts public
 * business data, stores provenance, dedups, optionally verifies emails, and
 * charges credits per billable action (only when a real provider runs). Stops
 * gracefully and asks the user to top up if credits run out mid-run.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-run", 8, 60 * 60_000); // 8/hour
  if (!rl.ok) return NextResponse.json({ error: "Lead scanning is rate-limited. Please wait before running again." }, { status: 429 });

  const { campaignId } = (await request.json().catch(() => ({}))) as { campaignId?: string };
  if (!campaignId) return NextResponse.json({ error: "Missing campaignId." }, { status: 400 });

  const { data: campaign } = await supabase.from("lead_campaigns").select("*").eq("id", campaignId).eq("user_id", user.id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const billScan = willUseFirecrawl();
  const billVerify = willUseNeverBounce();
  await supabase.from("lead_campaigns").update({ status: "running", error: null, updated_at: new Date().toISOString() }).eq("id", campaignId);

  let creditsUsed = 0;
  let toppedOut = false;
  const rawLeads: RawLead[] = [];

  try {
    for (const rawUrl of (campaign.source_urls as string[])) {
      if (rawLeads.length >= campaign.max_leads) break;
      const safe = await safeSourceUrl(rawUrl);
      if (!safe.ok) { await logCompliance(supabase, user.id, "blocked_url", `${rawUrl}: ${safe.error}`, { campaignId }); continue; }

      if (billScan && (await getCreditBalance()) < LEAD_CREDIT_COSTS.pageScan) { toppedOut = true; break; }
      const scrape = await crawlSourceUrl(safe.url);
      await logCompliance(supabase, user.id, "scan", safe.url, { campaignId });
      if (billScan) { await deductCredits(LEAD_CREDIT_COSTS.pageScan, "lead_page_scan"); creditsUsed += LEAD_CREDIT_COSTS.pageScan; }
      if (!scrape) continue;

      const raw = extractBusinessData(scrape, { country: campaign.country ?? undefined, city: campaign.city ?? undefined });

      // Best-effort: look at one public contact page if we still lack an email.
      if (!raw.email) {
        const contactPages = findContactPages(scrape);
        if (contactPages[0] && (!billScan || (await getCreditBalance()) >= LEAD_CREDIT_COSTS.contactDiscovery)) {
          const cp = await crawlSourceUrl(contactPages[0]);
          if (cp) {
            const cpData = extractBusinessData(cp);
            raw.email = raw.email ?? cpData.email;
            raw.phone = raw.phone ?? cpData.phone;
            raw.contact_page_url = contactPages[0];
            await logCompliance(supabase, user.id, "extract", `contact_page ${contactPages[0]}`, { campaignId });
            if (billScan) { await deductCredits(LEAD_CREDIT_COSTS.contactDiscovery, "lead_contact_discovery"); creditsUsed += LEAD_CREDIT_COSTS.contactDiscovery; }
          }
        }
      }

      const lead = normalizeLeadData(raw, { business_type: campaign.business_type ?? undefined });
      if (campaign.require_email && !lead.email) continue;
      rawLeads.push(lead);
    }

    // Dedup within batch + against the user's existing leads.
    const deduped = await removeDuplicates(supabase, user.id, rawLeads);

    // Persist leads + provenance.
    const insertedIds: { id: string; email?: string }[] = [];
    for (const l of deduped.slice(0, campaign.max_leads)) {
      const { data: inserted } = await supabase.from("leads").insert({
        user_id: user.id, campaign_id: campaignId,
        business_name: l.business_name ?? null, business_type: l.business_type ?? campaign.business_type ?? null,
        website: l.website ?? null, source_url: l.source_url, contact_page_url: l.contact_page_url ?? null,
        email: l.email ?? null, phone: l.phone ?? null, address: l.address ?? null,
        city: l.city ?? campaign.city ?? null, country: l.country ?? campaign.country ?? null,
        facebook_url: l.facebook_url ?? null, instagram_url: l.instagram_url ?? null, linkedin_url: l.linkedin_url ?? null,
        business_description: l.business_description ?? null, lead_status: "new",
      }).select("id, email").maybeSingle();
      if (inserted) {
        insertedIds.push({ id: inserted.id, email: inserted.email ?? undefined });
        await storeLeadSource(supabase, { userId: user.id, leadId: inserted.id, campaignId, url: l.source_url });
      }
    }

    // Optional email verification.
    let verified = 0;
    if (campaign.verify_emails) {
      for (const it of insertedIds) {
        if (!it.email) continue;
        if (billVerify && (await getCreditBalance()) < LEAD_CREDIT_COSTS.emailVerify) { toppedOut = true; break; }
        const result = await verifySingleEmail(it.email);
        await updateVerificationStatus(supabase, user.id, it.id, result);
        await logCompliance(supabase, user.id, "verify", `${it.email}: ${result.result}`, { campaignId, leadId: it.id });
        if (billVerify) { await deductCredits(LEAD_CREDIT_COSTS.emailVerify, "lead_email_verify"); creditsUsed += LEAD_CREDIT_COSTS.emailVerify; }
        verified++;
      }
    }

    await supabase.from("lead_campaigns").update({
      status: "completed", leads_found: insertedIds.length,
      credits_used: (campaign.credits_used ?? 0) + creditsUsed, updated_at: new Date().toISOString(),
    }).eq("id", campaignId);

    return NextResponse.json({
      ok: true, leadsFound: insertedIds.length, verified, creditsUsed,
      toppedOut, message: toppedOut ? "Credits ran low — some steps were skipped. Top up to finish." : undefined,
    });
  } catch (e) {
    await supabase.from("lead_campaigns").update({ status: "failed", error: e instanceof Error ? e.message : "run failed", updated_at: new Date().toISOString() }).eq("id", campaignId);
    return NextResponse.json({ error: "Lead run failed." }, { status: 500 });
  }
}
