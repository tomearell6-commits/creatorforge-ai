import { SeoStudio } from "@/components/dashboard/SeoStudio";
export const metadata = { title: "New SEO Article" };

export default async function NewSeoArticle({
  searchParams,
}: {
  searchParams: Promise<{ article?: string }>;
}) {
  const { article } = await searchParams;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{article ? "Edit SEO Article" : "New SEO Article"}</h1>
        <p className="mt-1 text-muted-foreground">Enter your keyword + brief, generate a full SEO package, edit, then publish to WordPress.</p>
      </div>
      <SeoStudio initialArticleId={article} />
    </div>
  );
}
