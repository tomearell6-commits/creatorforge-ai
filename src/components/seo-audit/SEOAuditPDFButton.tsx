"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SEO_AUDIT_PDF_CREDITS } from "@/lib/constants";

/**
 * Charges for a PDF export (5 credits) then triggers the browser's print dialog
 * ("Save as PDF"). Shows a Top Up prompt on insufficient credits.
 */
export function SEOAuditPDFButton({ auditId }: { auditId: string }) {
  const [busy, setBusy] = useState(false);
  const [needCredits, setNeedCredits] = useState(false);

  async function go() {
    setBusy(true); setNeedCredits(false);
    try {
      const r = await fetch("/api/seo-audit/download-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auditId }) });
      if (r.status === 402) { setNeedCredits(true); return; }
      if (r.ok) setTimeout(() => window.print(), 200);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={go} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF ({SEO_AUDIT_PDF_CREDITS} cr)
      </Button>
      {needCredits && <span className="text-xs text-amber-700">Not enough credits. <Link href="/dashboard/credits" className="underline">Top up</Link></span>}
    </div>
  );
}
