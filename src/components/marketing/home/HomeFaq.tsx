"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";

type QA = { category: string; q: string; a: string };

const CATEGORIES = ["General", "Pricing", "Credits", "Automation", "SEO", "Publishing", "Marketing", "Books", "Security", "Billing"];

const FAQS: QA[] = [
  { category: "General", q: "What is CreatorForge.io?", a: "An AI Business Operating System with six Studios — Content, Marketing, Publishing, Automation, Analytics, and Business — so you can create, market, publish, automate, analyze, and grow without leaving the platform." },
  { category: "General", q: "Who is it for?", a: "Creators, businesses, agencies, ecommerce stores, authors, marketers, educators, and entrepreneurs who want to build and grow with AI." },
  { category: "General", q: "Do I need any technical skills?", a: "No. Describe what you want in plain language and the Forge Assistant guides you through every workflow." },
  { category: "Pricing", q: "Is there a free plan?", a: "Yes — start free with trial credits, no credit card required. Upgrade any time for more credits and capabilities." },
  { category: "Pricing", q: "Can I change plans later?", a: "Yes, upgrade or downgrade whenever you like. Your credit balance and projects carry over." },
  { category: "Credits", q: "How do credits work?", a: "One transparent credit balance powers every Studio. Generation tasks show an estimated cost before you run them; browsing and editing are free." },
  { category: "Credits", q: "Can I top up credits?", a: "Yes. Top up instantly from the Credit Wallet — credits never expire while your account is active." },
  { category: "Automation", q: "What is Autopilot?", a: "Configure your content strategy once and Autopilot plans, schedules, and publishes on a recurring basis — with an approval step so you stay in control." },
  { category: "Automation", q: "Can I approve content before it publishes?", a: "Yes. The approval workflow lets you review every item in the publishing queue before it goes live." },
  { category: "SEO", q: "Can CreatorForge run an SEO audit?", a: "Yes. The Analytics Studio scans any page and returns a prioritized list of fixes, plus full-site website audits." },
  { category: "SEO", q: "Does it write SEO content?", a: "Yes — long-form, ranking-ready articles with optimized titles and meta descriptions." },
  { category: "Publishing", q: "Can I publish to WordPress?", a: "Yes. Connect your WordPress sites and auto-publish content on your schedule from the Automation Studio." },
  { category: "Marketing", q: "Which ad platforms are supported?", a: "Facebook, Instagram, Google, YouTube, LinkedIn, Pinterest, and TikTok — generate campaigns and creatives for each." },
  { category: "Books", q: "Can I write a full book?", a: "Yes. The Publishing Studio takes you from concept and outline to full chapters, an original cover, and export — all AI-assisted." },
  { category: "Books", q: "What formats can I export?", a: "TXT, Markdown, HTML, and Word today, plus print-to-PDF. EPUB and native DOCX are on the roadmap." },
  { category: "Security", q: "Is my content private?", a: "Yes. Every project, book, and asset is protected by row-level security and only accessible to your account." },
  { category: "Security", q: "Who can see my manuscripts?", a: "Only you. Private manuscripts are never exposed to other users, and exports require you to be signed in." },
  { category: "Billing", q: "What payment methods do you accept?", a: "Crypto top-ups are supported today via a secure checkout. Your balance updates automatically once payment is confirmed." },
  { category: "Billing", q: "Do credits roll over?", a: "Purchased and bonus credits remain available while your account is active; monthly plan credits refresh each cycle." },
];

export function HomeFaq() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => (cat === "All" || f.category === cat) && (!q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)));
  }, [query, cat]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search FAQs…"
          aria-label="Search frequently asked questions"
          className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {["All", ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3 py-1 text-sm font-medium ${cat === c ? "bg-brand-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}>{c}</button>
        ))}
      </div>

      <div className="space-y-2">
        {results.map((f) => {
          const id = f.category + f.q;
          const isOpen = open === id;
          return (
            <div key={id} className="rounded-xl border border-border bg-card">
              <button onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="text-sm font-semibold text-foreground">{f.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && <p className="cf-fade px-4 pb-4 text-sm text-muted-foreground">{f.a}</p>}
            </div>
          );
        })}
        {results.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No answers match “{query}”. Try a different search.</p>}
      </div>
    </div>
  );
}
