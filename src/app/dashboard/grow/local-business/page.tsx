import { LocalBusinessDashboard } from "@/components/local-business/LocalBusinessDashboard";

export const metadata = { title: "Local Business Studio — CreatorsForge AI" };

export default function LocalBusinessOverviewPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Local Business Studio</h1>
        <p className="mt-1 text-muted-foreground">
          Manage, audit, and optimize your Google Business Profile, prepare professional local posts and branded images,
          and plan your local marketing — all in one place. An AI optimization &amp; publishing workspace, not a ranking guarantee.
        </p>
      </div>
      <LocalBusinessDashboard />
    </div>
  );
}
