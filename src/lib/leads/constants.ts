/** Lead Generator constants: credit costs, business types, statuses. */

/** Credits charged per billable action (only when a real provider runs). */
export const LEAD_CREDIT_COSTS = {
  pageScan: 1,          // per page crawled
  extraction: 0,        // extraction bundled into the page scan
  contactDiscovery: 1,  // per contact-page discovered/fetched
  emailVerify: 1,       // per email verified
  brevoSyncPer: 25,     // 1 credit per 25 contacts synced
  campaignSendPer: 20,  // 1 credit per 20 emails sent
  campaignCreate: 2,    // per campaign created
} as const;

export const LEAD_BUSINESS_TYPES = [
  "Pet shops", "Groomers", "Vets", "Ecommerce stores", "Restaurants",
  "Real estate agencies", "Gyms", "Beauty salons", "Clinics", "Law firms",
  "Accountants", "Coaches", "Consultants", "Agencies", "Wholesalers", "Local businesses",
] as const;

/** NeverBounce-style verification results. Only "valid"/"catchall" are outreach-eligible. */
export const VERIFICATION_STATUSES = ["valid", "invalid", "disposable", "catchall", "unknown", "failed"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export const OUTREACH_ELIGIBLE: VerificationStatus[] = ["valid", "catchall"];

export const LEAD_STATUSES = [
  "new", "verified", "invalid", "ready", "synced", "contacted",
  "opened", "clicked", "replied", "bounced", "unsubscribed", "do_not_contact",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Human labels for lead statuses (UI). */
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New", verified: "Verified", invalid: "Invalid", ready: "Ready for Outreach",
  synced: "Synced to Brevo", contacted: "Contacted", opened: "Opened", clicked: "Clicked",
  replied: "Replied", bounced: "Bounced", unsubscribed: "Unsubscribed", do_not_contact: "Do Not Contact",
};

/** Required compliance footer appended to every outreach email. */
export const UNSUBSCRIBE_FOOTER =
  "You are receiving this email because your business contact information is publicly available. If you do not wish to receive future emails, please unsubscribe here.";

/** Statuses that must never receive outreach. */
export const SUPPRESSED_STATUSES: LeadStatus[] = ["invalid", "bounced", "unsubscribed", "do_not_contact"];

export const MAX_LEADS_PER_CAMPAIGN = 200;
export const MAX_SOURCE_URLS = 10;
