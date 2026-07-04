"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Download the codes as a .txt file — client-side only, nothing leaves the browser. */
export function BackupCodesDownloadButton({ codes }: { codes: string[] }) {
  function download() {
    const content = [
      "CreatorsForge.io — Two-Factor Backup Codes",
      "Each code works exactly once. Store this file somewhere safe.",
      "",
      ...codes,
      "",
      `Generated: ${new Date().toISOString()}`,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "creatorsforge-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button variant="ghost" onClick={download}>
      Download .txt
    </Button>
  );
}

/** One-time reveal of the 10 backup codes with copy + download actions. */
export function BackupCodesDisplay({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-4">
        {codes.map((c) => (
          <code key={c} className="text-center font-mono text-sm tracking-wide">
            {c}
          </code>
        ))}
      </div>
      <p className="mt-3 text-xs text-amber-600 dark:text-amber-500">
        Save your backup codes somewhere safe. They can help you recover your account if you lose access
        to your authenticator app — and this is the only time they&apos;ll be shown.
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" onClick={copyAll}>
          {copied ? "Copied ✓" : "Copy all"}
        </Button>
        <BackupCodesDownloadButton codes={codes} />
      </div>
    </div>
  );
}
