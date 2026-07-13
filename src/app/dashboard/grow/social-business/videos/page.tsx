import Link from "next/link";
import { ArrowLeft, Video, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "AI Video Studio — Social Business Studio" };

const FORMATS = ["Reels", "Shorts", "TikTok videos", "Product demos", "Company intro", "Educational clips", "Promo videos", "Customer stories", "Event announcements", "B2B thought-leadership"];

export default function SocialVideosPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">AI Video Studio</h1>
        <p className="mt-1 text-muted-foreground">Generate social videos in the Video Studio, then return here to schedule and publish them across platforms.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2"><Video className="h-5 w-5 text-brand-600" /><h2 className="text-base font-semibold">Create a social video</h2></div>
        <p className="mt-1 text-sm text-muted-foreground">The Content Generator writes a per-platform video prompt for each post. Open the Video Studio to script, render, and store the MP4 — your platforms, campaign, and schedule are preserved when you come back.</p>
        <div className="mt-3 flex flex-wrap gap-2">{FORMATS.map((f) => <span key={f} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{f}</span>)}</div>
        <Button asChild className="mt-4"><Link href="/dashboard/create?group=video">Open Video Studio <ArrowRight className="h-4 w-4" /></Link></Button>
      </Card>
    </div>
  );
}
