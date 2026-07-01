"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * CSV / XLSX export buttons. DNC and unsubscribed leads are excluded server-side.
 */
export function LeadExportButton({
  listId,
  campaignId,
  size = "sm",
}: {
  listId?: string;
  campaignId?: string;
  size?: "sm" | "md" | "lg";
}) {
  function download(format: "csv" | "xlsx") {
    const params = new URLSearchParams({ format });
    if (listId) params.set("listId", listId);
    if (campaignId) params.set("campaignId", campaignId);
    window.open(`/api/leads/export?${params.toString()}`, "_blank");
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div className="inline-flex gap-2">
        <Button type="button" variant="outline" size={size} onClick={() => download("csv")}>
          <Download className="h-4 w-4" aria-hidden /> CSV
        </Button>
        <Button type="button" variant="outline" size={size} onClick={() => download("xlsx")}>
          <Download className="h-4 w-4" aria-hidden /> XLSX
        </Button>
      </div>
      <span className="text-xs text-muted-foreground">Do-not-contact and unsubscribed leads are excluded.</span>
    </div>
  );
}
