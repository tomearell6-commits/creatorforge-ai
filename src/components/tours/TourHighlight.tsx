"use client";

/**
 * Dims the page and cuts a "hole" around the target rect using a large
 * box-shadow spread. The ring is pointer-events:none so the highlighted element
 * stays clickable; when there's no rect, a full dim layer is shown instead.
 */
export function TourHighlight({ rect }: { rect: DOMRect | null }) {
  if (!rect) {
    return <div className="fixed inset-0 z-[90] bg-black/50" aria-hidden />;
  }
  const pad = 6;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[90] rounded-xl ring-2 ring-brand-400 transition-all"
      style={{
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
      }}
    />
  );
}
