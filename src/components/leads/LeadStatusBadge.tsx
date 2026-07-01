import { Badge } from "@/components/ui/Badge";
import { LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/leads/constants";

type BadgeVariant = "default" | "brand" | "success" | "warning" | "danger" | "info" | "outline";

const SUCCESS = new Set(["valid", "catchall", "ready", "verified", "synced"]);
const DANGER = new Set(["invalid", "disposable", "bounced", "unsubscribed", "do_not_contact"]);
const WARNING = new Set(["new", "contacted", "unknown"]);

function variantFor(status: string): BadgeVariant {
  if (SUCCESS.has(status)) return "success";
  if (DANGER.has(status)) return "danger";
  if (WARNING.has(status)) return "warning";
  return "default";
}

/**
 * Renders a Badge for a lead_status or verification_status.
 * Falls back to the raw value (prettified) when there is no LEAD_STATUS_LABEL entry
 * (e.g. verification-only values like "catchall" / "disposable").
 */
export function LeadStatusBadge({ status }: { status?: string | null }) {
  if (!status) return <Badge variant="default">Unknown</Badge>;
  const label = LEAD_STATUS_LABEL[status as LeadStatus] ?? status.replace(/_/g, " ");
  return <Badge variant={variantFor(status)}>{label}</Badge>;
}
