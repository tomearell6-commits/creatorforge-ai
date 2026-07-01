/**
 * Transactional email sender. Uses Brevo (BREVO_API_KEY) when configured; a
 * no-op otherwise so flows work in dev without a provider. Never logs API keys,
 * tokens, or message bodies.
 */
import { fetchWithTimeout } from "@/lib/http";

type SendArgs = { to: string; subject: string; html: string; text?: string };

export function emailConfigured(): boolean {
  return !!process.env.BREVO_API_KEY;
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    // No provider configured — succeed silently so the surrounding flow proceeds.
    return { sent: false };
  }
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@creatorsforge.io";
  const senderName = process.env.BREVO_SENDER_NAME || "CreatorsForge.io";

  try {
    const res = await fetchWithTimeout("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        ...(text ? { textContent: text } : {}),
      }),
    });
    if (!res.ok) {
      // Log status only — never the key or payload.
      return { sent: false, error: `email_provider_${res.status}` };
    }
    return { sent: true };
  } catch {
    return { sent: false, error: "email_provider_unreachable" };
  }
}
