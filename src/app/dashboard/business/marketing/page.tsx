import Link from "next/link";
import { ArrowRight, Megaphone, Rocket, CalendarDays, Mail, Image as ImageIcon, Video, FileText, Share2 } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";

export const metadata = { title: "B2B Marketing Center — Business — CreatorsForge AI" };

const TOOLS = [
  { label: "Ad Campaigns", href: "/dashboard/ads/create", icon: Megaphone, desc: "Product launches, brand awareness, lead-gen and retention campaigns across every platform." },
  { label: "Autopilot Campaigns", href: "/dashboard/autopilot/campaigns/new", icon: Rocket, desc: "Configure once — AI plans, you approve, it schedules. Email & social sequences included." },
  { label: "Publishing Calendar", href: "/dashboard/calendar", icon: CalendarDays, desc: "Everything scheduled, in one calendar. Drag to reschedule." },
  { label: "Approval Queue", href: "/dashboard/autopilot/queue", icon: Share2, desc: "Nothing publishes without your approval (until you opt into Autopilot)." },
  { label: "AI Content Generator", href: "/dashboard/create", icon: FileText, desc: "Blog posts, announcements, promos, seasonal campaigns and more." },
  { label: "AI Image Generator", href: "/dashboard/design/new", icon: ImageIcon, desc: "Product shots, banners, social graphics, posters — on your brand kit." },
  { label: "AI Video Generator", href: "/dashboard/create?group=video", icon: Video, desc: "Product videos, reels, shorts, explainers and video ads." },
  { label: "Email Assistant", href: "/dashboard/email", icon: Mail, desc: "Inbox triage, drafts and daily summaries via secure OAuth." },
];

export default function BusinessMarketingPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Campaign workflow</CardTitle>
        <CardDescription className="mt-1">
          Create → Review → <strong>Approve</strong> → Schedule → Publish → Analyse. The AI prepares every step;
          publishing waits for your approval unless you explicitly enable Autopilot in Business Settings.
        </CardDescription>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <Card key={t.label} className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-brand-100 p-2 text-brand-900 dark:bg-brand-950/50 dark:text-brand-300">
                <t.icon className="h-5 w-5" />
              </span>
              <h2 className="font-bold">{t.label}</h2>
            </div>
            <CardDescription className="mt-2 flex-1">{t.desc}</CardDescription>
            <Link href={t.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
