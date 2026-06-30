"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type Article = { id: string; main_keyword: string; seo_title: string; status: string; category: string; scheduled_at: string | null; published_at: string | null; seo_score: number; created_at: string };

const ARTICLE_STATUS_VARIANT = {
  published: "success",
  failed: "danger",
  scheduled: "warning",
  draft: "warning",
} as const;

function Stat({ label, value }: { label: string; value: string | number }) {
  return <Card className="p-4"><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></Card>;
}

export function SeoDashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sites, setSites] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/seo/articles").then((r) => r.json()),
      fetch("/api/wordpress/sites").then((r) => r.json()),
    ]).then(([a, s]) => { setArticles(a.articles ?? []); setSites((s.sites ?? []).length); setLoading(false); });
  }, []);

  const published = articles.filter((a) => a.status === "published").length;
  const scheduled = articles.filter((a) => a.status === "scheduled").length;
  const drafts = articles.filter((a) => a.status === "draft").length;
  const failed = articles.filter((a) => a.status === "failed").length;
  const successRate = published + failed > 0 ? Math.round((published / (published + failed)) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild><Link href="/dashboard/seo/new">＋ New SEO Article</Link></Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Articles generated" value={articles.length} />
        <Stat label="Published" value={published} />
        <Stat label="Scheduled" value={scheduled} />
        <Stat label="Drafts" value={drafts} />
        <Stat label="WordPress sites" value={sites} />
        <Stat label="Publishing success" value={`${successRate}%`} />
        <Stat label="Avg SEO score" value={articles.length ? Math.round(articles.reduce((s, a) => s + (a.seo_score || 0), 0) / articles.length) : "—"} />
        <Stat label="Failed" value={failed} />
      </div>

      <Card>
        <h3 className="font-semibold">Recent articles</h3>
        {loading && <p className="mt-2 text-sm text-muted-foreground">Loading…</p>}
        {!loading && articles.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No articles yet — create your first SEO article.</p>}
        <div className="mt-3 space-y-2">
          {articles.slice(0, 12).map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/seo/new?article=${a.id}`}
              className="flex items-center justify-between rounded-lg border border-border p-2 text-sm transition-colors hover:border-brand-400 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{a.seo_title || a.main_keyword}</div>
                <div className="text-xs text-muted-foreground">{a.main_keyword} · SEO {a.seo_score ?? "—"}</div>
              </div>
              <Badge variant={ARTICLE_STATUS_VARIANT[a.status as keyof typeof ARTICLE_STATUS_VARIANT] ?? "default"} className="shrink-0">{a.status}</Badge>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
