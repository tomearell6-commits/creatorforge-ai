import { Star } from "lucide-react";
import { TESTIMONIALS, type Testimonial } from "@/lib/marketing";
import { createClient } from "@/lib/supabase/server";

/** Published testimonials from the DB, or the bundled samples as fallback. */
async function loadTestimonials(): Promise<{ items: Testimonial[]; isSample: boolean }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("testimonials")
      .select("name, role, quote, rating, platform, accent")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    if (data && data.length > 0) return { items: data as Testimonial[], isSample: false };
  } catch { /* table not migrated yet → fall back */ }
  return { items: TESTIMONIALS, isSample: true };
}

const ACCENT: Record<string, string> = {
  pink: "bg-pink-100 text-pink-700", sky: "bg-sky-100 text-sky-700", violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700", rose: "bg-rose-100 text-rose-700",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < n ? "fill-amber-400 text-amber-400" : "text-border"}`} />
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 break-inside-avoid rounded-2xl border border-border bg-card p-6 shadow-sm">{children}</div>;
}

/** "Loved by creators worldwide" — original testimonials section (masonry grid). */
export async function Testimonials() {
  const { items, isSample } = await loadTestimonials();
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-600">Testimonials</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-5xl">Loved by creators worldwide</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Join thousands of creators, marketers, and entrepreneurs who trust CreatorForge for their content.
        </p>
      </div>

      <div className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3">
        {/* Original product mockup card (our own dashboard, not a copied screenshot) */}
        <Card>
          <div className="rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 p-4 dark:from-brand-500/10 dark:to-violet-500/10">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Creator earnings</span><span>Last 30 days</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-ink dark:text-foreground">$5,052.85</p>
            <svg viewBox="0 0 240 60" className="mt-2 h-14 w-full" preserveAspectRatio="none" aria-hidden>
              <polyline fill="none" stroke="#84cc16" strokeWidth="2.5" points="0,52 30,46 60,48 90,32 120,36 150,20 180,24 210,10 240,14" />
              <polyline fill="rgba(132,204,22,0.12)" stroke="none" points="0,52 30,46 60,48 90,32 120,36 150,20 180,24 210,10 240,14 240,60 0,60" />
            </svg>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div><p className="font-semibold text-ink dark:text-foreground">248.4K</p><p className="text-muted-foreground">Views</p></div>
              <div><p className="font-semibold text-ink dark:text-foreground">+37.0K</p><p className="text-muted-foreground">Subs</p></div>
              <div><p className="font-semibold text-ink dark:text-foreground">2M</p><p className="text-muted-foreground">Reach</p></div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Real results from a consistent publishing schedule — powered by CreatorForge Autopilot.</p>
        </Card>

        {items.map((t) => (
          <Card key={t.name}>
            <Stars n={t.rating} />
            <p className="mt-3 text-[15px] leading-relaxed text-ink dark:text-foreground">“{t.quote}”</p>
            <div className="mt-4 flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${ACCENT[t.accent] ?? "bg-muted text-foreground"}`}>{initials(t.name)}</span>
              <div>
                <p className="text-sm font-semibold text-ink dark:text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}{t.platform ? ` · ${t.platform}` : ""}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isSample && (
        <p className="mt-6 text-center text-xs text-muted-foreground">Sample testimonials shown for layout. Add real ones in Admin → Testimonials.</p>
      )}
    </section>
  );
}
