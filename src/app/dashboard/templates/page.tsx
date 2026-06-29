import Link from "next/link";
import { Wand2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TEMPLATE_SECTIONS } from "@/lib/marketing";

export const metadata = { title: "Templates — CreatorForge AI" };

// Map a template name → the closest content category for a prefilled new project.
const CATEGORY_FOR: Record<string, string> = {
  "Horror Story": "horror-stories",
  "Motivational Video": "motivational",
  "Anime Style": "anime-stories",
  "3D Cartoon": "kids-stories",
  "Product Demo": "product-ads",
  "UGC Ad": "product-ads",
  "Marketplace Ad": "product-ads",
  "Business Promo": "business-marketing",
  "Crypto Explainer": "finance",
  "Reddit Story": "relationship-stories",
  "Top 5 List": "educational",
  "Did You Know": "educational",
};

function hrefFor(name: string) {
  const params = new URLSearchParams({ idea: `${name} video` });
  const cat = CATEGORY_FOR[name];
  if (cat) params.set("category", cat);
  return `/dashboard/projects/new?${params.toString()}`;
}

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="mt-1 text-muted-foreground">Pick a starting point — we&apos;ll spin up a new project pre-filled for you.</p>
      </div>

      {TEMPLATE_SECTIONS.map((section) => (
        <div key={section.id}>
          <h2 className="mb-3 text-lg font-semibold">{section.label}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {section.items.map((name) => (
              <Link key={name} href={hrefFor(name)}>
                <Card className="group h-full transition-colors hover:border-brand-400">
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-brand-100 to-muted text-3xl">
                    🎬
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-medium">{name}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">
                      <Wand2 className="h-3.5 w-3.5" /> Recreate
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
