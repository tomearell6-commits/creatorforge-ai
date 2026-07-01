/**
 * Branded transactional email templates (CreatorForge design language).
 * Pure string builders — no secrets, no tokens are ever embedded beyond the
 * one-time action URL the caller passes in.
 */
const BRAND = "#84cc16";
const INK = "#0f1b0a";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.creatorsforge.io";

function layout(opts: { heading: string; body: string; buttonLabel?: string; buttonUrl?: string; footnote?: string }): string {
  const button =
    opts.buttonLabel && opts.buttonUrl
      ? `<tr><td style="padding:8px 0 24px">
           <a href="${opts.buttonUrl}" style="display:inline-block;background:${BRAND};color:${INK};font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px">${opts.buttonLabel}</a>
         </td></tr>`
      : "";
  return `<!doctype html><html><body style="margin:0;background:#f6f7f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e6e8e3;border-radius:16px;padding:32px">
          <tr><td style="font-size:20px;font-weight:800;padding-bottom:16px">CreatorForge<span style="color:${BRAND}">.io</span></td></tr>
          <tr><td style="font-size:18px;font-weight:700;padding-bottom:12px">${opts.heading}</td></tr>
          <tr><td style="font-size:14px;line-height:1.6;color:#3f4b39;padding-bottom:20px">${opts.body}</td></tr>
          ${button}
          ${opts.footnote ? `<tr><td style="font-size:12px;line-height:1.5;color:#8a9382;border-top:1px solid #eee;padding-top:16px">${opts.footnote}</td></tr>` : ""}
        </table>
        <div style="font-size:11px;color:#9aa398;padding-top:16px">© CreatorForge.io · The AI Business Operating System</div>
      </td></tr>
    </table>
  </body></html>`;
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: "Reset your CreatorForge.io password",
    html: layout({
      heading: "Reset your password",
      body: "We received a request to reset your password. Click the secure link below to create a new password. If you did not request this, you can safely ignore this email — your password will stay the same.",
      buttonLabel: "Reset Password",
      buttonUrl: resetUrl,
      footnote: "This link expires shortly for your security. If the button doesn't work, copy and paste the link into your browser.",
    }),
    text: `Reset your CreatorForge.io password\n\nWe received a request to reset your password. Open this secure link to create a new password:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
  };
}

export function passwordChangedEmail() {
  const securityUrl = `${APP_URL}/dashboard/settings`;
  return {
    subject: "Your CreatorForge.io password was changed",
    html: layout({
      heading: "Your password was changed",
      body: "Your CreatorForge.io account password was changed successfully. If you made this change, no further action is needed. If you did not make this change, please secure your account immediately.",
      buttonLabel: "Review Account Security",
      buttonUrl: securityUrl,
    }),
    text: `Your CreatorForge.io password was changed successfully. If this wasn't you, secure your account now: ${securityUrl}`,
  };
}

export function suspiciousActivityEmail(details: string) {
  const securityUrl = `${APP_URL}/dashboard/settings`;
  return {
    subject: "Security alert on your CreatorForge.io account",
    html: layout({
      heading: "Unusual activity detected",
      body: `We noticed activity that may need your attention: ${details}. If this was you, no action is needed. If not, review your account security right away.`,
      buttonLabel: "Review Account Security",
      buttonUrl: securityUrl,
    }),
    text: `Security alert on your CreatorForge.io account: ${details}. Review your security: ${securityUrl}`,
  };
}
