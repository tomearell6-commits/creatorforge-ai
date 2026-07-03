/**
 * Daily attention summary builder. Aggregates the user's stored
 * classifications (free) and asks Claude for "suggested next actions"
 * (billable, placeholder fallback). SERVER-ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { willUseRealEmailAI } from "./ai";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export type DailySummary = {
  needingReply: { from: string; subject: string; priority: string }[];
  critical: { from: string; subject: string; reason: string }[];
  draftsReady: number;
  followUpsDue: { from: string; subject: string; deadline: string | null }[];
  nextActions: string[];
  counts: { total: number; needsReply: number; critical: number; drafts: number };
};

export async function buildDailySummary(
  db: SupabaseClient,
  userId: string,
  accountId: string
): Promise<{ summary: DailySummary; usedAI: boolean }> {
  const [{ data: attention }, { data: drafts }, { data: classifications }] = await Promise.all([
    db.from("email_attention_items")
      .select("reason, priority, deadline, email_messages!inner(account_id, from_name, from_address, subject)")
      .eq("user_id", userId).eq("resolved", false).limit(50),
    db.from("email_draft_replies").select("id, status").eq("user_id", userId).in("status", ["suggested", "edited", "approved"]).limit(100),
    db.from("email_classifications")
      .select("category, priority, needs_reply, deadline, email_messages!inner(account_id, from_name, from_address, subject)")
      .eq("user_id", userId).limit(200),
  ]);

  type MsgJoin = { account_id: string; from_name: string | null; from_address: string | null; subject: string | null };
  const msgOf = (row: { email_messages: MsgJoin | MsgJoin[] }): MsgJoin =>
    Array.isArray(row.email_messages) ? row.email_messages[0] : row.email_messages;
  const forAccount = <T extends { email_messages: MsgJoin | MsgJoin[] }>(rows: T[] | null) =>
    (rows ?? []).filter((r) => msgOf(r).account_id === accountId);

  const cls = forAccount(classifications ?? []);
  const att = forAccount(attention ?? []);

  const needingReply = cls
    .filter((c) => (c as { needs_reply: boolean }).needs_reply)
    .slice(0, 10)
    .map((c) => ({ from: msgOf(c).from_name ?? msgOf(c).from_address ?? "?", subject: msgOf(c).subject ?? "", priority: (c as { priority: string }).priority }));
  const critical = att
    .filter((a) => (a as { priority: string }).priority === "critical")
    .map((a) => ({ from: msgOf(a).from_name ?? msgOf(a).from_address ?? "?", subject: msgOf(a).subject ?? "", reason: (a as { reason: string }).reason }));
  const followUpsDue = att
    .filter((a) => (a as { deadline: string | null }).deadline)
    .map((a) => ({ from: msgOf(a).from_name ?? "?", subject: msgOf(a).subject ?? "", deadline: (a as { deadline: string | null }).deadline }));

  const summary: DailySummary = {
    needingReply, critical, draftsReady: (drafts ?? []).length, followUpsDue,
    nextActions: [],
    counts: { total: cls.length, needsReply: needingReply.length, critical: critical.length, drafts: (drafts ?? []).length },
  };

  if (!willUseRealEmailAI()) {
    summary.nextActions = [
      critical.length ? `Handle ${critical.length} critical email(s) first.` : "No critical emails — nice.",
      needingReply.length ? `Reply to ${needingReply.length} waiting sender(s).` : "Nothing waiting on a reply.",
      summary.draftsReady ? `Review ${summary.draftsReady} prepared draft(s).` : "No drafts pending review.",
    ];
    return { summary, usedAI: false };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 600,
      system: "You are an executive assistant. Given email triage data, return ONLY minified JSON {nextActions:string[]} — 3-5 short, concrete, prioritized actions for today. No commentary.",
      messages: [{ role: "user", content: JSON.stringify({ needingReply, critical, draftsReady: summary.draftsReady, followUpsDue }) }],
    });
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("")
      .trim().replace(/^```json?/i, "").replace(/```$/, "");
    summary.nextActions = (JSON.parse(text) as { nextActions: string[] }).nextActions ?? [];
    return { summary, usedAI: true };
  } catch {
    summary.nextActions = ["Review critical emails", "Clear the needs-reply queue", "Approve or edit prepared drafts"];
    return { summary, usedAI: false };
  }
}
