import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PlayCircle } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

/** "See it in action" — autoplaying muted hero demo video (brand explainer).
 *  Override the source with NEXT_PUBLIC_DEMO_VIDEO_URL. */
const VIDEO_URL =
  process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ||
  "https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/marketing/demo.mp4";

export async function DemoVideo() {
  const t = getDictionary(await getServerLocale());
  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-brand-600">
          <PlayCircle className="h-4 w-4" /> {t.sections.demoEyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-4xl">
          {t.sections.demoTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          {t.sections.demoSubtitle}
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-ink shadow-xl">
        <video
          className="aspect-video w-full"
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
        />
      </div>

      <div className="mt-6 text-center">
        <Button asChild variant="accent" size="lg">
          <Link href="/signup">{t.sections.demoCta}</Link>
        </Button>
      </div>
    </section>
  );
}
