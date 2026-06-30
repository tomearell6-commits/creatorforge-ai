import Link from "next/link";
import { FolderKanban, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { getWalletSummary } from "@/lib/credits/wallet";
import { DashboardCreditCard } from "@/components/dashboard/DashboardCreditCard";
import { AssistantOnboardingCard } from "@/components/dashboard/AssistantOnboardingCard";
import { StudioGrid } from "@/components/dashboard/StudioGrid";

export const metadata = { title: "Dashboard — CreatorForge AI" };

export default async function DashboardHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, category, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });

  const wallet = await getWalletSummary();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">Your AI Business Operating System — pick a Studio to get started.</p>
      </div>

      {wallet && <DashboardCreditCard summary={wallet} />}

      {/* Six flagship Studios */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Studios</h2>
          <span className="text-xs text-muted-foreground">{count ?? 0} projects</span>
        </div>
        <StudioGrid />
      </div>

      <AssistantOnboardingCard />

      {/* Recent projects */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Recent projects</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/projects">View all</Link>
          </Button>
        </div>

        {projects && projects.length > 0 ? (
          <ul className="mt-4 divide-y divide-border">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    href={`/dashboard/projects/${p.id}`}
                    className="font-medium hover:text-brand-600"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {p.category} · {formatDate(p.created_at)}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{p.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No projects yet.</p>
            <Button asChild size="sm">
              <Link href="/dashboard/projects/new">Create your first project</Link>
            </Button>
          </div>
        )}
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <CardTitle>Need more credits?</CardTitle>
          <CardDescription>Top up instantly with crypto, or upgrade your plan.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="accent">
            <Link href="/dashboard/credits">
              <CreditCard className="h-4 w-4" /> Top Up
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/billing">Billing</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
