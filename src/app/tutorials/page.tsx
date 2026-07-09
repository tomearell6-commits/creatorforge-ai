import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/home/MarketingFooter";
import { TutorialLibrary } from "@/components/marketing/TutorialLibrary";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Tutorials — CreatorsForge AI",
  description: "Step-by-step video tutorials showing how to use CreatorsForge end to end.",
};

const V = "https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media";
const FALLBACK = [
  { id: "avatar-overview", title: "Meet CreatorsForge — guided by your AI host", category: "Getting Started", description: "An AI presenter walks you through what CreatorsForge does and how to get started.", video_url: `${V}/tutorials/avatar-overview.mp4`, duration: "0:45", level: "beginner" },
  { id: "create-video", title: "Create your first AI video", category: "Create", description: "From a prompt to script, scenes, voiceover, visuals and a rendered MP4.", video_url: `${V}/tutorials/lesson-create-video.mp4`, duration: "0:30", level: "beginner" },
  { id: "seo-blog", title: "Generate an SEO blog post", category: "SEO", description: "Write an optimized article and publish it to WordPress.", video_url: `${V}/tutorials/lesson-seo-blog.mp4`, duration: "0:25", level: "beginner" },
  { id: "seo-audit", title: "Run an SEO audit", category: "SEO", description: "Score your site and get a prioritized fix plan.", video_url: `${V}/tutorials/lesson-seo-audit.mp4`, duration: "0:25", level: "beginner" },
  { id: "connect", title: "Connect your accounts", category: "Publishing", description: "Link social platforms and WordPress before publishing.", video_url: `${V}/tutorials/lesson-connect.mp4`, duration: "0:20", level: "beginner" },
  { id: "credits", title: "Credits & crypto top-ups", category: "Billing", description: "How credits work and how to top up with crypto.", video_url: `${V}/tutorials/lesson-credits.mp4`, duration: "0:25", level: "beginner" },
  { id: "autopilot", title: "Set up Autopilot", category: "Automation", description: "Plan, schedule and publish content automatically.", video_url: `${V}/tutorials/lesson-autopilot.mp4`, duration: "0:30", level: "intermediate" },
  { id: "assistant", title: "Forge AI Assistant & guided tours", category: "Getting Started", description: "Get instant help and step-by-step guided tours.", video_url: `${V}/tutorials/lesson-assistant.mp4`, duration: "0:20", level: "beginner" },
  { id: "wrap", title: "Dark mode & wrap-up", category: "Getting Started", description: "Theme options and where to go next.", video_url: `${V}/tutorials/lesson-wrap.mp4`, duration: "0:20", level: "beginner" },
  { id: "walkthrough", title: "Full walkthrough — how CreatorsForge works", category: "Getting Started", description: "A guided end-to-end demo of the platform.", video_url: `${V}/tutorials/full-walkthrough.mp4`, duration: "0:25", level: "beginner" },
];

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
            Step-by-step videos showing exactly how CreatorsForge works — so you know what you&apos;re getting before you spend a credit.
          </p>
        </div>
        <div className="mt-12"><TutorialLibrary tutorials={tutorials} /></div>
      </main>
      <MarketingFooter />
    </div>
  );
}
