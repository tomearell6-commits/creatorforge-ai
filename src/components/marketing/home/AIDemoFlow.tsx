"use client";

import { useEffect, useState } from "react";
import { MessageSquare, FileText, Image as ImageIcon, Mic, Clapperboard, Search, Globe, Share2, BarChart3, Check } from "lucide-react";

const STEPS = [
  { icon: MessageSquare, label: "Prompt entered", detail: "“Create a video about electric cars”" },
  { icon: FileText, label: "AI writes the script", detail: "Hook, body, and CTA generated" },
  { icon: ImageIcon, label: "Images generated", detail: "On-brand visuals for each scene" },
  { icon: Mic, label: "Voiceover generated", detail: "Natural AI narration" },
  { icon: Clapperboard, label: "Video rendered", detail: "Scenes + voice + captions" },
  { icon: Search, label: "SEO article created", detail: "Ranking-ready long-form post" },
  { icon: Globe, label: "WordPress scheduled", detail: "Auto-published to your site" },
  { icon: Share2, label: "Social media prepared", detail: "Captions + hashtags per platform" },
  { icon: BarChart3, label: "Analytics generated", detail: "Performance tracked automatically" },
];

export function AIDemoFlow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % (STEPS.length + 1)), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="relative space-y-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < active;
          const current = i === active;
          return (
            <li
              key={step.label}
              className={`flex items-center gap-4 rounded-2xl border p-4 transition-all duration-500 ${
                current ? "border-brand-400 bg-brand-50 shadow-sm dark:bg-brand-950/30"
                : done ? "border-border bg-card" : "border-border/60 bg-card opacity-55"
              }`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                done ? "bg-brand-600 text-white" : current ? "bg-brand-600 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <p className="truncate text-xs text-muted-foreground">{step.detail}</p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-center text-xs text-muted-foreground">One prompt → a complete content + publishing workflow, end to end.</p>
    </div>
  );
}
