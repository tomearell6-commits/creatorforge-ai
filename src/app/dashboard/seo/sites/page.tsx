import { WordPressSites } from "@/components/dashboard/WordPressSites";
export const metadata = { title: "WordPress Sites" };
export default function WordPressSitesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">WordPress Sites</h1><p className="mt-1 text-muted-foreground">Connect WordPress sites (Application Passwords, encrypted at rest) to publish your SEO articles.</p></div>
      <WordPressSites />
    </div>
  );
}
