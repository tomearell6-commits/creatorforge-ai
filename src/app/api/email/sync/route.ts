import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { rateLimitAsync } from "@/lib/security/ratelimit";
import { listMessages, demoInbox, providerFamily, type EmailProviderId } from "@/lib/email-assistant/providers";
import { getAccessToken } from "@/lib/email-assistant/tokens";
import { classifyEmail, willUseRealEmailAI } from "@/lib/email-assistant/ai";
import { estimateScanCredits, EMAIL_CREDIT_REASONS } from "@/lib/email-assistant/safety";
import { emitNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/email/sync { accountId, max? } — fetch recent inbox messages,
 * store them, classify NEW ones with AI, create needs-attention items, and
 * notify on critical emails. Rate-limited (3 syncs / 5 min per account).
 * Credits: estimateScanCredits(new messages) — charged only when real AI ran.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ accountId?: string; max?: number }>(request);
  if (!body?.accountId) return apiError("accountId is required", 400);
  const max = Math.min(50, Math.max(5, body.max ?? 25));

  const rl = await rateLimitAsync(`email-sync:${body.accountId}`, { limit: 3, windowMs: 300_000 });
  if (!rl.ok) return apiError(`Sync rate limit — try again in ${rl.retryAfterSec}s.`, 429);

  const { data: account } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("id", body.accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return apiError("Account not found", 404);
  if (account.status === "disconnected") return apiError("Account is disconnected — reconnect first.", 400);

  // 1. Fetch messages from the provider (demo inbox needs no network).
  let fetched;
  try {
    if (account.provider === "demo") {
      fetched = demoInbox();
    } else {
      const family = providerFamily(account.provider as EmailProviderId);
      if (family !== "google" && family !== "microsoft") return apiError("Provider not supported for sync.", 400);
      const token = await getAccessToken(createAdminClient(), account.id, family);
      fetched = await listMessages(family, token, max);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    await supabase.from("email_accounts").update({ last_sync_error: msg, status: "error", updated_at: new Date().toISOString() }).eq("id", account.id);
    return apiError(msg, 502);
  }

  // 2. Upsert messages; find which are new (no classification yet).
  const rows = fetched.map((m) => ({
    account_id: account.id, user_id: user.id, provider_msg_id: m.providerMsgId,
    thread_id: m.threadId ?? null, from_name: m.fromName ?? null, from_address: m.fromAddress ?? null,
    subject: m.subject ?? null, snippet: m.snippet ?? null, body_text: m.bodyText ?? null,
    received_at: m.receivedAt ?? null, is_demo: account.provider === "demo",
  }));
  if (rows.length) {
    await supabase.from("email_messages").upsert(rows, { onConflict: "account_id,provider_msg_id", ignoreDuplicates: true });
  }
  const { data: stored } = await supabase
    .from("email_messages")
    .select("id, from_name, from_address, subject, snippet, body_text, email_classifications(id)")
    .eq("account_id", account.id)
    .order("received_at", { ascending: false })
    .limit(max);
  const unclassified = (stored ?? []).filter((m) => !m.email_classifications || (m.email_classifications as unknown[]).length === 0);

  // 3. Credit pre-check for the classification pass.
  const billable = willUseRealEmailAI() && unclassified.length > 0;
  const cost = billable ? estimateScanCredits(unclassified.length) : 0;
  if (billable) {
    const balance = await getCreditBalance();
    if (balance < cost) {
      return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
    }
  }

  // 4. Classify new messages; build attention items; notify on critical.
  let usedAIAny = false;
  let criticalCount = 0;
  for (const m of unclassified) {
    const { result, usedAI } = await classifyEmail({ fromName: m.from_name, fromAddress: m.from_address, subject: m.subject, body: m.body_text ?? m.snippet });
    usedAIAny = usedAIAny || usedAI;
    await supabase.from("email_classifications").upsert(
      {
        message_id: m.id, user_id: user.id, category: result.category, priority: result.priority,
        summary: result.summary, needs_reply: result.needsReply, is_sensitive: result.isSensitive,
        deadline: result.deadline, used_ai: usedAI,
      },
      { onConflict: "message_id" }
    );
    if (result.attentionReason) {
      await supabase.from("email_attention_items").upsert(
        {
          message_id: m.id, user_id: user.id, reason: result.attentionReason,
          suggested_action: result.suggestedAction, priority: result.priority, deadline: result.deadline,
        },
        { onConflict: "message_id" }
      );
    }
    if (result.priority === "critical" && account.notify_critical) {
      criticalCount++;
      try {
        await emitNotification(supabase, {
          userId: user.id, type: "email_attention", title: "Critical email needs attention",
          body: `${m.from_name ?? m.from_address}: ${m.subject ?? ""}`.slice(0, 140),
          link: "/dashboard/email/needs-attention",
        });
      } catch { /* notification is best-effort */ }
    }
  }

  // 5. Charge only when real AI actually classified something.
  let creditsUsed = 0;
  if (usedAIAny && cost > 0) {
    const newBalance = await deductCredits(cost, EMAIL_CREDIT_REASONS.scan);
    if (newBalance !== null) creditsUsed = cost;
  }

  await supabase.from("email_accounts")
    .update({ last_synced_at: new Date().toISOString(), last_sync_error: null, status: "connected", updated_at: new Date().toISOString() })
    .eq("id", account.id);
  await supabase.from("email_activity_logs").insert({
    user_id: user.id, account_id: account.id, action: "sync",
    detail: `${fetched.length} fetched, ${unclassified.length} classified, ${criticalCount} critical`,
  });

  return NextResponse.json({
    ok: true, fetched: fetched.length, classified: unclassified.length,
    critical: criticalCount, creditsUsed, usedAI: usedAIAny,
  });
}
