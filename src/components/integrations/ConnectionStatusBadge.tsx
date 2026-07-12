"use client";

import { Check, AlertTriangle, Clock, Plug } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export type ConnectionStatus =
  | "not_connected" | "connecting" | "connected" | "expired" | "permission_required" | "connection_failed";

const META: Record<ConnectionStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info"; icon: typeof Check }> = {
  not_connected: { label: "Not connected", variant: "default", icon: Plug },
  connecting: { label: "Connecting…", variant: "info", icon: Clock },
  connected: { label: "Connected", variant: "success", icon: Check },
  expired: { label: "Expired", variant: "warning", icon: AlertTriangle },
  permission_required: { label: "Permission required", variant: "warning", icon: AlertTriangle },
  connection_failed: { label: "Connection failed", variant: "danger", icon: AlertTriangle },
};

/** Shared connection status pill — same look and language everywhere. */
export function ConnectionStatusBadge({ status }: { status: string }) {
  const m = META[(status as ConnectionStatus)] ?? META.not_connected;
  const Icon = m.icon;
  return <Badge variant={m.variant}><Icon className="h-3 w-3" /> {m.label}</Badge>;
}
