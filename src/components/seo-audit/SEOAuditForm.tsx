"use client";

import { useState } from "react";
import Link from "next/link";
import { Coins, Search, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { SEOAuditTypeSelector } from "./SEOAuditTypeSelector";
import { seoAuditType } from "@/lib/constants";

/** URL + audit-type form with estimated credit cost and Start Audit. */
export function SEOAuditForm({ onStart, busy, error }: { onStart: (url: string, type: string) => void; busy: boolean; error: string | null }) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState("quick");
  const cost = seoAuditType(type).credits;
  const insufficient = error?.toLowerCase().includes("not enough credits");

  return (
    <Card className="space-y-4">
      <div>
        <Label>Website URL</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" onKeyDown={(e) => e.key === "Enter" && onStart(url, type)} />
      </div>
      <div>
        <Label>Audit type</Label>
        <SEOAuditTypeSelector value={type} onChange={setType} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Coins className="h-4 w-4" /> Estimated cost: <b className="text-foreground">{cost} credits</b></span>
        <Button onClick={() => onStart(url, type)} disabled={busy || !url.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Start Audit
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600">
          {error}{insufficient && <> <Link href="/dashboard/credits" className="font-semibold underline">Top Up Credits</Link></>}
        </p>
      )}
    </Card>
  );
}
