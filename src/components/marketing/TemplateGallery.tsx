import Link from "next/link";
import { TEMPLATE_SECTIONS } from "@/lib/marketing";

const EMOJI: Record<string, string> = {
  "Horror Story": "👻", "Motivational Video": "🔥", "Anime Style": "🌸", "3D Cartoon": "🧸",
  "Product Demo": "🛍️", "UGC Ad": "🤳", "Marketplace Ad": "🏷️", "Business Promo": "📈",
  "Crypto Explainer": "🪙", "Reddit Story": "💬", "Top 5 List": "🏆", "Did You Know": "💡",
  "Music Visualizer": "🎵", "Lyric Video": "🎤", "Beat Loop": "🥁", "Concert Cut": "🎸",
};

export function TemplateGallery() {
  return (
    <div className="space-y-10">
      {TEMPLATE_SECTIONS.map((section) => (
        <div key={section.id}>
          <h3 className="mb-4 text-lg font-bold text-ink dark:text-foreground">{section.label}</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {section.items.map((item) => (
              <div key={item} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex h-28 items-center justify-center bg-gradient-to-br from-brand-100 to-emerald-50 text-4xl">
                  {EMOJI[item] ?? "🎬"}
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-sm font-medium text-ink dark:text-foreground">{item}</span>
                  <Link href="/signup" className="text-xs font-semibold text-brand-700 hover:underline">Recreate</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
