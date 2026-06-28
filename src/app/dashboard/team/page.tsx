import { TeamWorkspace } from "@/components/dashboard/TeamWorkspace";

export const metadata = { title: "Team Workspace" };

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Workspace</h1>
        <p className="mt-1 text-muted-foreground">Invite members, assign roles, and track activity.</p>
      </div>
      <TeamWorkspace />
    </div>
  );
}
