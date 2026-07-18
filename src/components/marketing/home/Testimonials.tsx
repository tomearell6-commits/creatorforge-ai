import { Quote, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "./Reveal";
import { TestimonialsComingSoon } from "./TestimonialsComingSoon";

type Testimonial = {
  id: string; name: string; role: string | null; quote: string;
  rating: number; platform: string | null; avatar_url: string | null;
};

/**
 * Real, admin-managed testimonials (Admin → Testimonials, `is_published`).
 * Shows the placeholder cards only until at least one real, consented
 * testimonial exists — we never fabricate reviews or people.
 */
export async function Testimonials() {
  let items: Testimonial[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("testimonials")
      .select("id, name, role, quote, rating, platform, avatar_url")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(6);
    items = data ?? [];
  } catch {
    items = []; // fall back to placeholder on any read error
  }

  if (items.length === 0) return <TestimonialsComingSoon />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t, i) => (
        <Reveal key={t.id} delay={i * 80}>
          <figure className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <Quote className="h-7 w-7 text-brand-500" aria-hidden />
            <div className="flex gap-0.5" aria-label={`${Math.round(t.rating)} out of 5`}>
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} className={`h-4 w-4 ${s < Math.round(t.rating) ? "fill-brand-500 text-brand-500" : "text-muted-foreground/30"}`} aria-hidden />
              ))}
            </div>
            <blockquote className="flex-1 text-sm leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</blockquote>
            <figcaption className="flex items-center gap-3">
              {t.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-900" aria-hidden>
                  {t.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t.name}</p>
                {(t.role || t.platform) && (
                  <p className="truncate text-xs text-muted-foreground">{[t.role, t.platform].filter(Boolean).join(" · ")}</p>
                )}
              </div>
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}
