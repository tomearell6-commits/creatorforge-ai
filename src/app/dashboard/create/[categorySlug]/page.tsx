import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowLeft, Coins, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getCategoryBySlug } from "@/config/contentCategories";
import { getDesignCategoryBySlug } from "@/config/designStudio";
import { WORKFLOWS } from "@/config/contentWorkflows";

export const metadata = { title: "Create — CreatorsForge AI" };

// Marketing/footer labels that should jump straight to a dedicated tool page.
const SLUG_ALIASES: Record<string, string> = {
  "seo-website-audit-tool": "/dashboard/seo/audit",
  "seo-audit": "/dashboard/seo/audit",
  "ai-design-studio": "/dashboard/design",
  "design-studio": "/dashboard/design",
  "real-estate-architecture-design": "/dashboard/design/industries/real-estate-architecture",
  "real-estate-architecture": "/dashboard/design/industries/real-estate-architecture",
  "industry-suites": "/dashboard/design/industries",
  "ai-website-app-builder": "/dashboard/build",
  "build-studio": "/dashboard/build",
};

export default async function CategoryWorkflowPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = await params;
  if (SLUG_ALIASES[categorySlug]) redirect(SLUG_ALIASES[categorySlug]);
  // Design Studio categories open the design wizard preselected.
  if (getDesignCategoryBySlug(categorySlug)) redirect(`/dashboard/design/new?category=${categorySlug}`);
  const category = getCategoryBySlug(categorySlug);

  if (!category) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="text-center">
          <h1 className="text-xl font-bold">Tool not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">That tool isn’t available yet. Browse all tools in the Create hub.</p>
          <Button asChild className="mt-4"><Link href="/dashboard/create">← Create Content</Link></Button>
        </Card>
      </div>
    );
  }

  const workflow = WORKFLOWS[category.workflowType];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/dashboard/create?group=${category.group}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {category.groupName}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{category.name}</h1>
        <p className="mt-1 text-muted-foreground">{category.shortDescription}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-border px-2 py-0.5">{category.output}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5"><Coins className="h-3 w-3" /> ~{category.creditEstimate} credits</span>
          <span className="rounded-full border border-border px-2 py-0.5">{workflow.label}</span>
        </div>
      </div>

      <Card>
        <h2 className="font-semibold">How it works</h2>
        <ol className="mt-3 space-y-2">
          {workflow.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" variant="accent"><Link href={category.route}>Start creating <ArrowRight className="h-4 w-4" /></Link></Button>
        <Button asChild size="lg" variant="outline"><Link href={`/dashboard/templates?group=${category.group}`}>View templates</Link></Button>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-brand-600" /> This tool uses the unified content workflow — the same one shown on the homepage.
      </p>
    </div>
  );
}
