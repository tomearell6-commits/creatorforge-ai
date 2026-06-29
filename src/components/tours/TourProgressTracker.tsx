"use client";

/** Step dots for the guided tour. */
export function TourProgressTracker({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-brand-600" : "w-1.5 bg-border"}`} />
      ))}
    </div>
  );
}
