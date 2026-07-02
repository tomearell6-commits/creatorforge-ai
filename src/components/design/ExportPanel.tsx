"use client";

import { useEffect, useState } from "react";
import { FileDown, FileText, Film, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type ExportRow = { id: string; format: string; status: string; url: string | null; credits_used: number; created_at: string };

const ICON: Record<string, typeof FileDown> = { png: ImageIcon, jpg: ImageIcon, pdf: FileText, mp4: Film, gif: Film };

/** Export history for the signed-in user. */
export function ExportPanel() {
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/design/export", { cache: "no-store" });
        const json = await res.json();
        if (res.ok) setRows(json.exports ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading exports…</div>;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        <FileDown className="mb-2 h-8 w-8 opacity-40" />
        No exports yet. Open a design in the editor and export it as PNG, JPG or PDF.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2 font-medium">Format</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Credits</th>
            <th className="px-4 py-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const Icon = ICON[r.format] ?? FileDown;
            return (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2"><span className="inline-flex items-center gap-1.5 uppercase"><Icon className="h-3.5 w-3.5" /> {r.format}</span></td>
                <td className="px-4 py-2"><Badge variant={r.status === "ready" ? "success" : r.status === "failed" ? "danger" : "warning"}>{r.status}</Badge></td>
                <td className="px-4 py-2 text-muted-foreground">{r.credits_used || "Free"}</td>
                <td className="px-4 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
