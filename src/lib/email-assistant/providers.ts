/**
 * Email provider layer — modular OAuth + message access.
 * SERVER-ONLY. Tokens are decrypted here and never leave the server.
 *
 * Providers activate via env (same dormant-until-configured pattern as the
 * social publishing OAuth):
 *   Gmail / Google Workspace : GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET
 *   Outlook / Microsoft 365  : MS_EMAIL_CLIENT_ID + MS_EMAIL_CLIENT_SECRET
 *   IMAP                     : placeholder (roadmap — needs an IMAP bridge)
 *   demo                     : built-in sample inbox (clearly flagged is_demo)
 *
 * IMPORTANT (Google): gmail.readonly / gmail.send are RESTRICTED scopes —
 * production use requires Google's OAuth verification. Use test users while
 * in development. Never ask users for raw email passwords.
 */
import { fetchWithTimeout } from "@/lib/http";

export type EmailProviderId = "gmail" | "google-workspace" | "outlook" | "microsoft365" | "imap" | "demo";

export type FetchedMessage = {
  providerMsgId: string;
  threadId?: string;
  fromName?: string;
  fromAddress?: string;
  subject?: string;
  snippet?: string;
  bodyText?: string;
  receivedAt?: string; // ISO
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.creatorsforge.io";
export const EMAIL_OAUTH_CALLBACK = `${APP_URL}/api/email/callback`;

// ---- Configuration ----------------------------------------------------------
export function isGoogleEmailConfigured(): boolean {
  return !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET);
}
export function isMicrosoftEmailConfigured(): boolean {
  return !!(process.env.MS_EMAIL_CLIENT_ID && process.env.MS_EMAIL_CLIENT_SECRET);
}

export function providerFamily(provider: EmailProviderId): "google" | "microsoft" | "imap" | "demo" {
  if (provider === "gmail" || provider === "google-workspace") return "google";
  if (provider === "outlook" || provider === "microsoft365") return "microsoft";
  if (provider === "imap") return "imap";
  return "demo";
}

export function isProviderConfigured(provider: EmailProviderId): boolean {
  const fam = providerFamily(provider);
  if (fam === "google") return isGoogleEmailConfigured();
  if (fam === "microsoft") return isMicrosoftEmailConfigured();
  if (fam === "demo") return true;
  return false; // imap placeholder
}

// ---- OAuth: authorize URLs ---------------------------------------------------
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "openid", "email",
].join(" ");
const MS_SCOPES = ["offline_access", "User.Read", "Mail.Read", "Mail.Send"].join(" ");

export function buildAuthorizeUrl(provider: EmailProviderId, state: string): string | null {
  const fam = providerFamily(provider);
  if (fam === "google" && isGoogleEmailConfigured()) {
    const p = new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      redirect_uri: EMAIL_OAUTH_CALLBACK,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  }
  if (fam === "microsoft" && isMicrosoftEmailConfigured()) {
    const p = new URLSearchParams({
      client_id: process.env.MS_EMAIL_CLIENT_ID!,
      redirect_uri: EMAIL_OAUTH_CALLBACK,
      response_type: "code",
      scope: MS_SCOPES,
      response_mode: "query",
      state,
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${p}`;
  }
  return null;
}

// ---- OAuth: code exchange + refresh --------------------------------------------
export type TokenSet = { accessToken: string; refreshToken?: string; expiresAt?: string; scopes?: string; email?: string };

export async function exchangeCode(family: "google" | "microsoft", code: string): Promise<TokenSet> {
  if (family === "google") {
    const res = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: process.env.GMAIL_CLIENT_ID!, client_secret: process.env.GMAIL_CLIENT_SECRET!,
        redirect_uri: EMAIL_OAUTH_CALLBACK, grant_type: "authorization_code",
      }),
    }, 15_000);
    if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
    const j = await res.json();
    // Resolve the account email from the id_token-less userinfo endpoint.
    let email: string | undefined;
    try {
      const ui = await fetchWithTimeout("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${j.access_token}` },
      }, 10_000);
      if (ui.ok) email = (await ui.json()).email;
    } catch { /* email resolution is best-effort */ }
    return {
      accessToken: j.access_token, refreshToken: j.refresh_token,
      expiresAt: new Date(Date.now() + (j.expires_in ?? 3600) * 1000).toISOString(),
      scopes: j.scope, email,
    };
  }
  const res = await fetchWithTimeout("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: process.env.MS_EMAIL_CLIENT_ID!, client_secret: process.env.MS_EMAIL_CLIENT_SECRET!,
      redirect_uri: EMAIL_OAUTH_CALLBACK, grant_type: "authorization_code", scope: MS_SCOPES,
    }),
  }, 15_000);
  if (!res.ok) throw new Error(`Microsoft token exchange failed (${res.status})`);
  const j = await res.json();
  let email: string | undefined;
  try {
    const me = await fetchWithTimeout("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${j.access_token}` },
    }, 10_000);
    if (me.ok) { const m = await me.json(); email = m.mail ?? m.userPrincipalName; }
  } catch { /* best-effort */ }
  return {
    accessToken: j.access_token, refreshToken: j.refresh_token,
    expiresAt: new Date(Date.now() + (j.expires_in ?? 3600) * 1000).toISOString(),
    scopes: j.scope, email,
  };
}

export async function refreshAccessToken(family: "google" | "microsoft", refreshToken: string): Promise<TokenSet> {
  const url = family === "google" ? "https://oauth2.googleapis.com/token" : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const body = family === "google"
    ? new URLSearchParams({ refresh_token: refreshToken, client_id: process.env.GMAIL_CLIENT_ID!, client_secret: process.env.GMAIL_CLIENT_SECRET!, grant_type: "refresh_token" })
    : new URLSearchParams({ refresh_token: refreshToken, client_id: process.env.MS_EMAIL_CLIENT_ID!, client_secret: process.env.MS_EMAIL_CLIENT_SECRET!, grant_type: "refresh_token", scope: MS_SCOPES });
  const res = await fetchWithTimeout(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }, 15_000);
  if (!res.ok) throw new Error(`Token refresh failed (${res.status})`);
  const j = await res.json();
  return {
    accessToken: j.access_token, refreshToken: j.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + (j.expires_in ?? 3600) * 1000).toISOString(),
  };
}

// ---- Message access ---------------------------------------------------------------
function decodeB64Url(s: string): string {
  try { return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); } catch { return ""; }
}

/** List recent inbox messages (Gmail REST / Microsoft Graph). */
export async function listMessages(family: "google" | "microsoft", accessToken: string, max = 25): Promise<FetchedMessage[]> {
  if (family === "google") {
    const list = await fetchWithTimeout(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&labelIds=INBOX`,
      { headers: { Authorization: `Bearer ${accessToken}` } }, 20_000
    );
    if (!list.ok) throw new Error(`Gmail list failed (${list.status})`);
    const ids: { id: string; threadId: string }[] = (await list.json()).messages ?? [];
    // Fetch metadata in parallel — sequential fetches would eat most of the
    // serverless time budget on a full 25-message scan.
    const settled = await Promise.all(ids.map(async (m) => {
      try {
        const res = await fetchWithTimeout(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } }, 15_000
        );
        if (!res.ok) return null;
        const j = await res.json();
        const h = (name: string) => (j.payload?.headers ?? []).find((x: { name: string; value: string }) => x.name.toLowerCase() === name.toLowerCase())?.value;
        const from = h("From") ?? "";
        const match = from.match(/^(.*?)\s*<(.+)>$/);
        return {
          providerMsgId: j.id, threadId: m.threadId,
          fromName: match ? match[1].replace(/(^"|"$)/g, "") : from,
          fromAddress: match ? match[2] : from,
          subject: h("Subject") ?? "(no subject)", snippet: j.snippet ?? "",
          receivedAt: j.internalDate ? new Date(Number(j.internalDate)).toISOString() : undefined,
        } as FetchedMessage;
      } catch { return null; }
    }));
    return settled.filter((x): x is FetchedMessage => x !== null);
  }
  const res = await fetchWithTimeout(
    `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${max}&$select=id,conversationId,from,subject,bodyPreview,receivedDateTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }, 20_000
  );
  if (!res.ok) throw new Error(`Graph list failed (${res.status})`);
  const j = await res.json();
  type GraphMsg = { id: string; conversationId?: string; from?: { emailAddress?: { name?: string; address?: string } }; subject?: string; bodyPreview?: string; receivedDateTime?: string };
  return ((j.value ?? []) as GraphMsg[]).map((m) => ({
    providerMsgId: m.id, threadId: m.conversationId,
    fromName: m.from?.emailAddress?.name, fromAddress: m.from?.emailAddress?.address,
    subject: m.subject ?? "(no subject)", snippet: m.bodyPreview ?? "", receivedAt: m.receivedDateTime,
  }));
}

/** Send a reply. Gmail wants a base64url RFC-822 message; Graph takes JSON. */
export async function sendReply(
  family: "google" | "microsoft",
  accessToken: string,
  opts: { to: string; subject: string; body: string; threadId?: string }
): Promise<void> {
  if (family === "google") {
    const raw = Buffer.from(
      `To: ${opts.to}\r\nSubject: ${opts.subject.startsWith("Re:") ? opts.subject : `Re: ${opts.subject}`}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${opts.body}`
    ).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const res = await fetchWithTimeout("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(opts.threadId ? { raw, threadId: opts.threadId } : { raw }),
    }, 20_000);
    if (!res.ok) throw new Error(`Gmail send failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return;
  }
  const res = await fetchWithTimeout("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: opts.subject.startsWith("Re:") ? opts.subject : `Re: ${opts.subject}`,
        body: { contentType: "Text", content: opts.body },
        toRecipients: [{ emailAddress: { address: opts.to } }],
      },
    }),
  }, 20_000);
  if (!res.ok) throw new Error(`Graph send failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

// ---- Demo inbox (clearly-flagged sample data for testing the pipeline) --------------
export function demoInbox(): FetchedMessage[] {
  const now = Date.now();
  const iso = (hoursAgo: number) => new Date(now - hoursAgo * 3600_000).toISOString();
  return [
    { providerMsgId: "demo-1", fromName: "Sarah Chen", fromAddress: "sarah@acmecorp.example", subject: "[DEMO] Urgent: proposal deadline is Friday", snippet: "Hi — we need your revised proposal by Friday EOD or we'll have to go with another vendor…", bodyText: "Hi — we need your revised proposal by Friday EOD or we'll have to go with another vendor. Can you confirm you'll make it?", receivedAt: iso(2) },
    { providerMsgId: "demo-2", fromName: "Mike Torres", fromAddress: "mike@customer.example", subject: "[DEMO] Problem with my last order", snippet: "The export I downloaded is corrupted and I have a client presentation tomorrow…", bodyText: "The export I downloaded is corrupted and I have a client presentation tomorrow. Please help ASAP.", receivedAt: iso(5) },
    { providerMsgId: "demo-3", fromName: "Priya Patel", fromAddress: "priya@bigbrand.example", subject: "[DEMO] Partnership opportunity", snippet: "We loved your platform and would like to discuss a co-marketing partnership…", bodyText: "We loved your platform and would like to discuss a co-marketing partnership. Are you free next week?", receivedAt: iso(20) },
    { providerMsgId: "demo-4", fromName: "Billing", fromAddress: "billing@vendor.example", subject: "[DEMO] Invoice #4821 due in 3 days", snippet: "Your invoice #4821 for $249.00 is due on the 6th…", bodyText: "Your invoice #4821 for $249.00 is due on the 6th. Please arrange payment.", receivedAt: iso(26) },
    { providerMsgId: "demo-5", fromName: "TechWeekly", fromAddress: "digest@techweekly.example", subject: "[DEMO] This week in AI — 12 stories", snippet: "Your weekly roundup of AI news…", bodyText: "Your weekly roundup of AI news and tutorials.", receivedAt: iso(30) },
    { providerMsgId: "demo-6", fromName: "James Okafor", fromAddress: "james@prospect.example", subject: "[DEMO] Interested in your agency plan", snippet: "We're a 12-person team looking for exactly what you offer — can you share pricing?", bodyText: "We're a 12-person team looking for exactly what you offer — can you share pricing for the agency plan?", receivedAt: iso(8) },
  ];
}
