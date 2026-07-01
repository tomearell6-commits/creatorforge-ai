import { SeoAudit } from "@/components/seo-audit/SeoAudit";

export const metadata = { title: "SEO Audit — CreatorsForge AI" };

export default function SeoAuditPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SEO Website Audit</h1>
        <p className="mt-1 text-muted-foreground">
          Enter your website URL to get a full SEO audit — scores, issues, a prioritized fix plan, and AI content recommendations.
        </p>
      </div>
      <SeoAudit />
    </div>
  );
}
