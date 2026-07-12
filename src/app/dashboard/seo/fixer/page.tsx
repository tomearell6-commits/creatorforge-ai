import { WpFixer } from "@/components/seo/WpFixer";

export const metadata = { title: "WordPress SEO Fixer — CreatorsForge AI" };

export default function WpFixerPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">WordPress SEO Fixer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your WordPress site and let the AI audit it and apply approved SEO fixes for you — you review every change before it goes live.
        </p>
      </div>
      <WpFixer />
    </div>
  );
}
