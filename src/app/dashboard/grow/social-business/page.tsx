import { SocialBusinessDashboard } from "@/components/social-business/SocialBusinessDashboard";

export const metadata = { title: "Social Business Studio — CreatorsForge AI" };

export default function SocialBusinessOverviewPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Business Studio</h1>
        <p className="mt-1 text-muted-foreground">
          Connect your social accounts, create platform-specific content, schedule and publish, organize enquiries, and
          understand your performance — one workspace across every supported platform. Uses official sign-in; we never
          ask for your passwords or claim a post succeeded unless the platform confirms it.
        </p>
      </div>
      <SocialBusinessDashboard />
    </div>
  );
}
