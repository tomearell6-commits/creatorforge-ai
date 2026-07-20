/**
 * Brevo outreach service — contact lists, contacts, email campaigns, and stats.
 * Real Brevo REST when BREVO_API_KEY is set; otherwise safe no-ops that report
 * `configured:false` so the UI can prompt for setup. Never throws, never logs
 * the API key.
 *
 * Spec name: services/brevoCampaignService.ts
 */
import { fetchWithTimeout } from "@/lib/http";

const BASE = "https://api.brevo.com/v3";

export function willUseBrevo(): boolean { return !!process.env.BREVO_API_KEY; }

async function brevo(path: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetchWithTimeout(`${BASE}${path}`, {
    method,
    headers: { "api-key": process.env.BREVO_API_KEY!, "Content-Type": "application/json", accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: unknown = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { ok: res.ok, status: res.status, json };
}

export type LeadContact = { email: string; business_name?: string | null };

/** Create (or return) a Brevo contact list. */
export async function createContactList(name: string): Promise<{ configured: boolean; listId?: number; error?: string }> {
  if (!willUseBrevo()) return { configured: false };
  try {
    const r = await brevo("/contacts/lists", "POST", { name, folderId: 1 });
    if (!r.ok) return { configured: true, error: `brevo_${r.status}` };
    return { configured: true, listId: (r.json as { id?: number }).id };
  } catch { return { configured: true, error: "brevo_unreachable" }; }
}

export async function createContact(email: string, attributes: Record<string, unknown> = {}, listIds: number[] = []): Promise<{ ok: boolean }> {
  if (!willUseBrevo()) return { ok: false };
  try {
    const r = await brevo("/contacts", "POST", { email, attributes, listIds, updateEnabled: true });
    return { ok: r.ok || r.status === 204 };
  } catch { return { ok: false }; }
}

/** Sync eligible contacts into a Brevo list. Caller pre-filters suppressed leads. */
export async function syncLeadsToBrevo(listId: number, contacts: LeadContact[]): Promise<{ configured: boolean; synced: number }> {
  if (!willUseBrevo()) return { configured: false, synced: 0 };
  let synced = 0;
  for (const c of contacts) {
    const r = await createContact(c.email, { BUSINESS: c.business_name ?? "" }, [listId]);
    if (r.ok) synced++;
  }
  return { configured: true, synced };
}

export async function createEmailCampaign(args: { name: string; subject: string; htmlContent: string; listId: number; senderName: string; senderEmail: string; replyTo?: string }): Promise<{ configured: boolean; campaignId?: number; error?: string }> {
  if (!willUseBrevo()) return { configured: false };
  try {
    const r = await brevo("/emailCampaigns", "POST", {
      name: args.name, subject: args.subject, sender: { name: args.senderName, email: args.senderEmail },
      htmlContent: args.htmlContent, recipients: { listIds: [args.listId] },
      ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    });
    if (!r.ok) {
      const msg = (r.json as { message?: string })?.message;
      return { configured: true, error: msg || `brevo_${r.status}` };
    }
    return { configured: true, campaignId: (r.json as { id?: number }).id };
  } catch { return { configured: true, error: "brevo_unreachable" }; }
}

export async function sendCampaign(campaignId: number): Promise<{ configured: boolean; ok: boolean }> {
  if (!willUseBrevo()) return { configured: false, ok: false };
  try {
    const r = await brevo(`/emailCampaigns/${campaignId}/sendNow`, "POST");
    return { configured: true, ok: r.ok || r.status === 204 };
  } catch { return { configured: true, ok: false }; }
}

export async function fetchCampaignStats(campaignId: number): Promise<{ configured: boolean; stats?: { sent: number; opened: number; clicked: number; bounced: number; unsubscribed: number } }> {
  if (!willUseBrevo()) return { configured: false };
  try {
    const r = await brevo(`/emailCampaigns/${campaignId}`, "GET");
    const g = (r.json as { statistics?: { globalStats?: Record<string, number> } })?.statistics?.globalStats ?? {};
    return { configured: true, stats: { sent: g.sent ?? 0, opened: g.uniqueViews ?? g.viewed ?? 0, clicked: g.uniqueClicks ?? g.clickers ?? 0, bounced: (g.hardBounces ?? 0) + (g.softBounces ?? 0), unsubscribed: g.unsubscriptions ?? 0 } };
  } catch { return { configured: true }; }
}

/** Placeholders for webhook-driven suppression (Brevo posts these events). */
export function handleBounces(): void { /* wired via Brevo webhook → lead_email_events */ }
export function handleUnsubscribes(): void { /* wired via Brevo webhook → mark lead unsubscribed + DNC */ }
