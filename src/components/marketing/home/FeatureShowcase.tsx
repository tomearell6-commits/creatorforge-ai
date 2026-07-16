import Link from "next/link";
import {
  Video, Search, BookOpen, Megaphone, Globe, Share2, Bot, FileSearch,
  ScanSearch, Wallet, BarChart3, Rocket, ArrowRight,
} from "lucide-react";
import { Reveal } from "./Reveal";

// "Learn More" links point to public info pages (studio pages, SEO landing,
// pricing) so visitors can explore before signing up — no login walls.
const FEATURES = [
  { icon: Video, title: "AI Video Creation", desc: "Scripts, voice, scenes, and rendered video from a single prompt.", href: "/studios/content" },
  { icon: Search, title: "SEO Content", desc: "Long-form articles and metadata engineered to rank.", href: "/tools/seo-content-studio" },
  { icon: BookOpen, title: "Book Publishing", desc: "Outline, write, design, and export full-length books.", href: "/studios/publishing" },
  { icon: Megaphone, title: "AI Advertising", desc: "Campaigns and creatives for every major ad platform.", href: "/studios/marketing" },
  { icon: Globe, title: "WordPress Automation", desc: "Auto-publish content straight to your WordPress sites.", href: "/studios/automation" },
  { icon: Share2, title: "Social Media Automation", desc: "Schedule and prepare posts across your channels.", href: "/studios/marketing" },
  { icon: Bot, title: "Forge AI Assistant", desc: "A page-aware assistant that guides every workflow.", href: "/#studios" },
  { icon: FileSearch, title: "SEO Audit", desc: "Scan any page and get a prioritized fix list.", href: "/studios/analytics" },
  { icon: ScanSearch, title: "Website Audit", desc: "Full-site technical and content health checks.", href: "/studios/analytics" },
  { icon: Wallet, title: "Credit Wallet", desc: "One transparent credit balance across every Studio.", href: "/pricing" },
  { icon: BarChart3, title: "Analytics", desc: "Track content, campaigns, and growth in one place.", href: "/studios/analytics" },
  { icon: Rocket, title: "Autopilot", desc: "Plan once and let CreatorsForge publish on schedule.", href: "/studios/automation" },
];

export function FeatureShowcase() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f, i) => {
        const Icon = f.icon;
        return (
          <Reveal key={f.title} delay={(i % 3) * 70}>
            <div className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-400 hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-900 transition-transform duration-300 group-hover:scale-110 dark:bg-brand-950/50 dark:text-brand-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
              <Link href={f.href} className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                Learn More <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
