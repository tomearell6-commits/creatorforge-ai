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

// ---- Credit & subscription notification emails --------------------------
const CREDITS_URL = `${APP_URL}/dashboard/credits`;
const BILLING_URL = `${APP_URL}/dashboard/billing`;
const SUPPORT_URL = `${APP_URL}/dashboard/support`;
const link = (url: string, label: string) => `<a href="${url}" style="color:#4d7c0f;font-weight:600;text-decoration:underline">${label}</a>`;
const SUPPORT_FOOT = `Need help? Contact ${link(SUPPORT_URL, "support")}. Manage alerts in Settings → Notifications.`;

export type CreditEmailCtx = { name?: string | null; planName: string; remaining: number; used: number };

function creditBody(ctx: CreditEmailCtx, lead: string): string {
  return `${lead}<br/><br/>
    <b>Plan:</b> ${ctx.planName}<br/>
    <b>Credits remaining:</b> ${ctx.remaining.toLocaleString()}<br/>
    <b>Credits used:</b> ${ctx.used.toLocaleString()}<br/><br/>
    Top up any time from your ${link(CREDITS_URL, "Credit Wallet")}, or review your ${link(BILLING_URL, "Billing")}.`;
}

export function creditLowEmail(ctx: CreditEmailCtx) {
  return {
    subject: "Your CreatorForge.io credits are running low",
    html: layout({ heading: "Your credits are running low", body: creditBody(ctx, `Hi ${ctx.name || "there"}, you've used about 75% of your credits.`), buttonLabel: "Top Up Credits", buttonUrl: CREDITS_URL, footnote: SUPPORT_FOOT }),
    text: `Your CreatorForge.io credits are running low. Plan ${ctx.planName}, ${ctx.remaining} remaining. Top up: ${CREDITS_URL}`,
  };
}
export function creditCriticalEmail(ctx: CreditEmailCtx) {
  return {
    subject: "Your CreatorForge.io credits are almost finished",
    html: layout({ heading: "Your credits are almost finished", body: creditBody(ctx, `Hi ${ctx.name || "there"}, you have under 10% of your credits left. Top up now to avoid interruption.`), buttonLabel: "Top Up Credits", buttonUrl: CREDITS_URL, footnote: SUPPORT_FOOT }),
    text: `Your CreatorForge.io credits are almost finished (${ctx.remaining} left). Top up: ${CREDITS_URL}`,
  };
}
export function creditExhaustedEmail(ctx: CreditEmailCtx) {
  return {
    subject: "Your CreatorForge.io credits are exhausted",
    html: layout({ heading: "You're out of credits", body: creditBody(ctx, `Hi ${ctx.name || "there"}, you've used all your credits. Generation is paused until you top up — editing and browsing stay available.`), buttonLabel: "Top Up Credits", buttonUrl: CREDITS_URL, footnote: SUPPORT_FOOT }),
    text: `Your CreatorForge.io credits are exhausted. Top up to continue: ${CREDITS_URL}`,
  };
}

export function topupSuccessEmail(credits: number) {
  return {
    subject: "Your CreatorForge.io credit top-up was successful",
    html: layout({ heading: "Credits added", body: `${credits.toLocaleString()} credits were added to your wallet and are ready to use. Thank you!`, buttonLabel: "Open Credit Wallet", buttonUrl: CREDITS_URL, footnote: SUPPORT_FOOT }),
    text: `${credits} credits were added to your CreatorForge.io wallet: ${CREDITS_URL}`,
  };
}

const REMINDER_SUBJECTS: Record<number, string> = {
  14: "Your CreatorForge.io subscription renews soon",
  7: "Your CreatorForge.io subscription renewal is coming up",
  3: "Your CreatorForge.io subscription renews in 3 days",
  1: "Your CreatorForge.io subscription renews tomorrow",
};
export function subscriptionReminderEmail(opts: { planName: string; days: number; renewalDate: string }) {
  const subject = REMINDER_SUBJECTS[opts.days] || "Your CreatorForge.io subscription renews soon";
  const when = opts.days === 1 ? "tomorrow" : `in ${opts.days} days`;
  return {
    subject,
    html: layout({ heading: subject, body: `Your <b>${opts.planName}</b> plan renews ${when} (${opts.renewalDate}). No action is needed if your payment details are up to date.`, buttonLabel: "Manage Billing", buttonUrl: BILLING_URL, footnote: SUPPORT_FOOT }),
    text: `Your CreatorForge.io ${opts.planName} subscription renews ${when} (${opts.renewalDate}). Manage: ${BILLING_URL}`,
  };
}
export function paymentFailedEmail(planName: string) {
  return {
    subject: "There was a problem with your CreatorForge.io payment",
    html: layout({ heading: "Your payment didn't go through", body: `We couldn't process the payment for your <b>${planName}</b> plan. Please update your payment method to keep your subscription active.`, buttonLabel: "Update Payment Method", buttonUrl: BILLING_URL, footnote: SUPPORT_FOOT }),
    text: `Your CreatorForge.io payment for ${planName} failed. Update payment: ${BILLING_URL}`,
  };
}
export function subscriptionExpiredEmail(planName: string) {
  return {
    subject: "Your CreatorForge.io subscription has expired",
    html: layout({ heading: "Your subscription has expired", body: `Your <b>${planName}</b> subscription has ended. Renew any time to restore your plan's monthly credits and features.`, buttonLabel: "Renew Subscription", buttonUrl: BILLING_URL, footnote: SUPPORT_FOOT }),
    text: `Your CreatorForge.io ${planName} subscription has expired. Renew: ${BILLING_URL}`,
  };
}
export function subscriptionRenewedEmail(planName: string) {
  return {
    subject: "Your CreatorForge.io subscription was renewed",
    html: layout({ heading: "Subscription renewed", body: `Your <b>${planName}</b> subscription renewed successfully and your monthly credits have been refreshed. Thank you for being with CreatorForge.io!`, buttonLabel: "Open Dashboard", buttonUrl: `${APP_URL}/dashboard`, footnote: SUPPORT_FOOT }),
    text: `Your CreatorForge.io ${planName} subscription renewed. ${APP_URL}/dashboard`,
  };
}
