import { SeoAutoposter } from "@/components/seo/SeoAutoposter";

export const metadata = { title: "SEO Auto-Poster — CreatorsForge" };

export default function SeoAutopostPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SEO Auto-Poster</h1>
        <p className="mt-1 text-muted-foreground">Fully automatic daily blog posts for your WordPress websites — written, illustrated, published and announced to search engines.</p>
      </div>
      <SeoAutoposter />
    </div>
  );
}
