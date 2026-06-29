import { SeoDashboard } from "@/components/dashboard/SeoDashboard";
export const metadata = { title: "SEO Studio" };
export default function SeoStudioHome() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">SEO Studio</h1><p className="mt-1 text-muted-foreground">Generate SEO blog packages and publish them to WordPress.</p></div>
      <SeoDashboard />
    </div>
  );
}
