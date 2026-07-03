import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { buildAuthorizeUrl, isProviderConfigured, demoInbox, type EmailProviderId } from "@/lib/email-assistant/providers";
import { DEFAULT_PERMISSION_MODE, type PermissionMode } from "@/lib/email-assistant/safety";

export const dynamic = "force-dynamic";

/**
 * POST /api/email/connect { provider, permissionMode, consent: true }
 *
 * OAuth providers → returns the authorize URL (state is bound to an httpOnly
 * cookie; the callback verifies it). Demo provider → creates a clearly-flagged
 * sample account + inbox immediately so the pipeline is testable without
 * OAuth apps. Never accepts passwords. Explicit consent is required.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ provider?: EmailProviderId; permissionMode?: PermissionMode; consent?: boolean }>(request);
  if (!body?.provider) return apiError("provider is required", 400);
  if (body.consent !== true) return apiError("Explicit consent is required to connect an email account.", 400);

  const mode = body.permissionMode ?? DEFAULT_PERMISSION_MODE;

  if (body.provider === "demo") {
    const { data: account, error } = await supabase
      .from("email_accounts")
      .upsert(
        {
          user_id: user.id, provider: "demo", email_address: "demo-inbox@creatorsforge.io",
          display_name: "Demo Inbox (sample data)", permission_mode: mode,
          status: "connected", consent_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider,email_address" }
      )
      .select("*")
      .single();
    if (error) return apiError(error.message, 500);

    // Seed the sample messages (idempotent on provider_msg_id).
    const rows = demoInbox().map((m) => ({
      account_id: account.id, user_id: user.id, provider_msg_id: m.providerMsgId,
      from_name: m.fromName ?? null, from_address: m.fromAddress ?? null,
      subject: m.subject ?? null, snippet: m.snippet ?? null, body_text: m.bodyText ?? null,
      received_at: m.receivedAt ?? null, is_demo: true,
    }));
    await supabase.from("email_messages").upsert(rows, { onConflict: "account_id,provider_msg_id", ignoreDuplicates: true });
    await supabase.from("email_activity_logs").insert({ user_id: user.id, account_id: account.id, action: "connect", detail: "demo inbox" });
    return NextResponse.json({ connected: true, account });
  }

  if (body.provider === "imap") {
    return apiError("IMAP support is on the roadmap — use Gmail, Outlook, or the Demo Inbox for now.", 400);
  }
  if (!isProviderConfigured(body.provider)) {
    return apiError(
      `${body.provider} OAuth is not configured yet. The platform owner must set ` +
        (body.provider.startsWith("g") || body.provider === "google-workspace" ? "GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET" : "MS_EMAIL_CLIENT_ID + MS_EMAIL_CLIENT_SECRET") +
        " in the environment (see docs/EMAIL-ASSISTANT.md). Try the Demo Inbox meanwhile.",
      501
    );
  }

  const state = randomUUID();
  const authorizeUrl = buildAuthorizeUrl(body.provider, state);
  if (!authorizeUrl) return apiError("Failed to build the authorization URL.", 500);

  const jar = await cookies();
  jar.set("email_oauth_state", JSON.stringify({ state, provider: body.provider, mode }), {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });

  return NextResponse.json({ authorizeUrl });
}
