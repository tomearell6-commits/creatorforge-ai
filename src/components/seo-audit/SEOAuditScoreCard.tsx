"use client";

/** A 0–100 SEO score with a color badge (green/yellow/red). */
export function SEOAuditScoreCard({ label, score, big }: { label: string; score: number | null | undefined; big?: boolean }) {
  const v = score ?? 0;
  const color = v >= 80 ? "text-brand-700 bg-brand-100" : v >= 50 ? "text-amber-700 bg-amber-100" : "text-red-700 bg-red-100";
  const ring = v >= 80 ? "ring-brand-300" : v >= 50 ? "ring-amber-300" : "ring-red-300";
  return (
    <div className={`rounded-xl border border-border p-4 text-center ${big ? "sm:p-6" : ""}`}>
      <div className={`mx-auto flex items-center justify-center rounded-full ring-2 ${ring} ${color} ${big ? "h-20 w-20 text-2xl" : "h-14 w-14 text-lg"} font-bold`}>{v}</div>
      <p className={`mt-2 ${big ? "text-sm font-medium" : "text-xs"} text-muted-foreground`}>{label}</p>
    </div>
  );
}
