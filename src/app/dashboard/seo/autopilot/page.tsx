import { SeoAutopilot } from "@/components/seo/SeoAutopilot";

export const metadata = { title: "SEO Autopilot — CreatorsForge" };

export default function SeoAutopilotPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SEO Autopilot</h1>
        <p className="mt-1 text-muted-foreground">Enter your website. We study it, plan 30 days of articles, and publish one every day.</p>
      </div>
      <SeoAutopilot />
    </div>
  );
}
