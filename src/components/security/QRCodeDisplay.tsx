"use client";

/* eslint-disable @next/next/no-img-element */

/** QR for the authenticator app + the manual-entry secret underneath. */
export function QRCodeDisplay({ qrDataUrl, secret }: { qrDataUrl: string; secret: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl border border-border bg-white p-3">
        <img src={qrDataUrl} alt="QR code for your authenticator app" width={200} height={200} />
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Can&apos;t scan? Enter this key manually:</p>
        <code className="mt-1 block select-all break-all rounded bg-muted px-2 py-1 font-mono text-xs tracking-wider">
          {secret.replace(/(.{4})/g, "$1 ").trim()}
        </code>
      </div>
    </div>
  );
}
