"use client";

import { Badge } from "@/components/ui/Badge";
import { CAPABILITY_LABEL, type CapabilityLevel } from "@/config/socialProviderCapabilities";

const VARIANT: Record<CapabilityLevel, "success" | "info" | "warning" | "default"> = {
  supported: "success", limited: "info", manual: "warning", not_available: "default",
};

/** Shared per-capability level pill (Supported / Limited / Manual / Not available). */
export function PlatformCapabilityBadge({ level, label }: { level: CapabilityLevel; label?: string }) {
  return <Badge variant={VARIANT[level]}>{label ? `${label}: ` : ""}{CAPABILITY_LABEL[level]}</Badge>;
}
