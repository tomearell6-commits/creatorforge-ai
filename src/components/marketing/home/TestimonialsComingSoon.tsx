import { Quote } from "lucide-react";
import { Reveal } from "./Reveal";

/**
 * Placeholder testimonials. We intentionally do NOT fabricate reviews or people —
 * these are layout-ready cards that read "Customer testimonials coming soon" until
 * real, verified testimonials are added (Admin → Testimonials).
 */
export function TestimonialsComingSoon() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Reveal key={i} delay={i * 80}>
          <div className="flex h-full flex-col gap-4 rounded-2xl border border-dashed border-border bg-card p-6">
            <Quote className="h-7 w-7 text-brand-300" />
            <p className="flex-1 text-sm text-muted-foreground">Customer testimonials coming soon.</p>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-24 rounded bg-muted" />
                <div className="h-2 w-16 rounded bg-muted/70" />
              </div>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
