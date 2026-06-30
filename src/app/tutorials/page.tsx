import { Header } from "@/components/marketing/Header";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { TutorialLibrary } from "@/components/marketing/TutorialLibrary";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Tutorials — CreatorForge AI",
  description: "Step-by-step video tutorials showing how to use CreatorForge end to end.",
};

const FALLBACK = [{
  id: "overview", title: "How CreatorForge works — overview", category: "Getting Started",
  description: "A quick end-to-end tour: from a single prompt to a finished, published video.",
  video_url: "https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/marketing/demo.mp4",
  duration: "0:21", level: "beginner",
}];

export default async function TutorialsPage() {
  let tutorials = FALLBACK;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("tutorials")
      .select("id, title, description, category, video_url, thumbnail_url, duration, level")
      .eq("is_published", true).order("category").order("sort_order");
    if (data && data.length > 0) tutorials = data;
  } catch { /* table not migrated yet → fallback */ }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-4xl">Tutorials</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Step-by-step videos showing exactly how CreatorForge works — so you know what you&apos;re getting before you spend a credit.
          </p>
        </div>
        <div className="mt-12"><TutorialLibrary tutorials={tutorials} /></div>
      </main>
      <SiteFooter />
    </div>
  );
}
