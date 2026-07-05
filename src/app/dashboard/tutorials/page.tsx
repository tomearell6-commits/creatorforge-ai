import { createClient } from "@/lib/supabase/server";
import { TutorialCenter } from "@/components/tutorials/TutorialCenter";

export const metadata = { title: "Watch Demo & Tutorials — CreatorsForge AI" };

export default async function DashboardTutorialsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tutorials")
    .select("id, title, slug, description, category, video_url, thumbnail_url, duration, level, status, target_route, cta_label, cta_url")
    .eq("is_published", true)
    .order("category")
    .order("sort_order");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Watch Demo &amp; Tutorials</h1>
        <p className="mt-1 text-muted-foreground">
          Short walkthrough videos for every part of the platform. Watching is always free.
        </p>
      </div>
      <TutorialCenter tutorials={data ?? []} />
    </div>
  );
}
