"use client";

import { useEffect, useState } from "react";
import { ContentCompletionPanel } from "@/components/publishing/ContentCompletionPanel";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SEO_ARTICLE_TYPES, SEO_SEARCH_INTENTS, SEO_WORD_COUNTS, SEO_CREDIT_COSTS } from "@/lib/constants";

const sel = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

type Article = {
  id: string; seo_title: string; meta_title: string; meta_description: string; slug: string;
  h1: string; article_content: string; excerpt: string; tags: string[]; category: string;
  faq_json: { q: string; a: string }[]; main_keyword: string; secondary_keywords: string[];
  seo_score: number; readability_score: number; status: string;
};
type Site = { id: string; site_name: string; site_url: string };

export function SeoStudio({ initialArticleId }: { initialArticleId?: string } = {}) {
  const [form, setForm] = useState({
    mainKeyword: "", secondaryKeywords: "", targetCountry: "", targetAudience: "",
    searchIntent: SEO_SEARCH_INTENTS[0] as string, articleType: SEO_ARTICLE_TYPES[0] as string, tone: "professional",
    wordCount: 1500, language: "en", brandName: "", productName: "", cta: "",
  });
  const [generating, setGenerating] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState("");
  const [mode, setMode] = useState<"draft" | "now" | "schedule">("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [msg, setMsg] = useState<{ kind: "info" | "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  useEffect(() => {
    fetch("/api/wordpress/sites").then((r) => r.json()).then((j) => { setSites(j.sites ?? []); if (j.sites?.[0]) setSiteId(j.sites[0].id); });
  }, []);

  // Open an existing article in the editor (from the SEO Dashboard).
  useEffect(() => {
    if (!initialArticleId) return;
    fetch(`/api/seo/articles/${initialArticleId}`).then((r) => r.json()).then((j) => { if (j.article) setArticle(j.article); });
  }, [initialArticleId]);

  async function generate() {
    if (!form.mainKeyword.trim()) { setMsg({ kind: "error", text: "Enter a main keyword." }); return; }
    setGenerating(true); setMsg(null);
    const res = await fetch("/api/seo/generate-article", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, secondaryKeywords: form.secondaryKeywords.split(",").map((s) => s.trim()).filter(Boolean) }),
    });
    const j = await res.json();
    if (!res.ok) setMsg({ kind: "error", text: j.error || "Generation failed." });
    else {
      setArticle(j.article);
      setMsg({ kind: "success", text: j.usedAI ? "Generated with AI." : "Generated (placeholder — set ANTHROPIC_API_KEY for real AI)." });
      recordWorkflow(j.article.id, j.article.seo_title, ["create"], "review", "Generated article");
    }
    setGenerating(false);
  }

  // Record six-stage workflow progress (Create → Review → … ) — fire-and-forget.
  function recordWorkflow(projectId: string, title: string, completedSteps: string[], currentStep: string, lastAction: string) {
    fetch("/api/workflow/state", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectType: "seo_article", projectId, title, completedSteps, currentStep, lastAction }),
    }).catch(() => {});
  }

  function setField<K extends keyof Article>(k: K, v: Article[K]) {
    setArticle((a) => (a ? { ...a, [k]: v } : a));
  }

  async function save() {
    if (!article) return;
    setBusy(true);
    await fetch(`/api/seo/articles/${article.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seo_title: article.seo_title, meta_description: article.meta_description, slug: article.slug,
        article_content: article.article_content, excerpt: article.excerpt, tags: article.tags, category: article.category,
      }),
    });
    setMsg({ kind: "success", text: "Saved." });
    setBusy(false);
  }

  function requestPublish() {
    if (!article) return;
    if (!siteId) { setMsg({ kind: "error", text: "Connect a WordPress site first (SEO Studio → WordPress Sites)." }); return; }
    if (mode === "schedule" && !scheduledAt) { setMsg({ kind: "error", text: "Pick a date/time." }); return; }
    setConfirmPublish(true);
  }

  async function publish() {
    if (!article) return;
    setBusy(true); setMsg(null);
    await save();
    const res = await fetch("/api/wordpress/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId: article.id, siteId, mode, scheduledAt: mode === "schedule" ? new Date(scheduledAt).toISOString() : null }),
    });
    const j = await res.json();
    if (res.ok) {
      setMsg({ kind: "success", text: mode === "now" ? `Published! ${j.url}` : mode === "schedule" ? "Scheduled on WordPress." : "Saved as WordPress draft." });
      recordWorkflow(article.id, article.seo_title, ["create", "review", "connect", "publish"], "analyze",
        mode === "now" ? "Published to WordPress" : mode === "schedule" ? "Scheduled on WordPress" : "Saved WordPress draft");
    } else setMsg({ kind: "error", text: j.error || "Publish failed." });
    setBusy(false);
    setConfirmPublish(false);
  }

  // ----- Step 1: input form -----
  if (!article) {
    return (
      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="ss-main-keyword">Main keyword *</Label><Input id="ss-main-keyword" value={form.mainKeyword} onChange={(e) => setForm({ ...form, mainKeyword: e.target.value })} placeholder="e.g. best dog food for puppies" /></div>
          <div><Label htmlFor="ss-secondary-keywords">Secondary keywords (comma-separated)</Label><Input id="ss-secondary-keywords" value={form.secondaryKeywords} onChange={(e) => setForm({ ...form, secondaryKeywords: e.target.value })} placeholder="puppy nutrition, grain-free" /></div>
          <div><Label htmlFor="ss-target-country">Target country</Label><Input id="ss-target-country" value={form.targetCountry} onChange={(e) => setForm({ ...form, targetCountry: e.target.value })} placeholder="United States" /></div>
          <div><Label htmlFor="ss-target-audience">Target audience</Label><Input id="ss-target-audience" value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} placeholder="New pet owners" /></div>
          <div><Label htmlFor="ss-search-intent">Search intent</Label><select id="ss-search-intent" className={sel} value={form.searchIntent} onChange={(e) => setForm({ ...form, searchIntent: e.target.value })}>{SEO_SEARCH_INTENTS.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><Label htmlFor="ss-article-type">Article type</Label><select id="ss-article-type" className={sel} value={form.articleType} onChange={(e) => setForm({ ...form, articleType: e.target.value })}>{SEO_ARTICLE_TYPES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><Label htmlFor="ss-tone">Tone</Label><Input id="ss-tone" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} /></div>
          <div><Label htmlFor="ss-word-count">Word count</Label><select id="ss-word-count" className={sel} value={form.wordCount} onChange={(e) => setForm({ ...form, wordCount: Number(e.target.value) })}>{SEO_WORD_COUNTS.map((w) => <option key={w} value={w}>{w} words</option>)}</select></div>
          <div><Label htmlFor="ss-brand-name">Brand name</Label><Input id="ss-brand-name" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} /></div>
          <div><Label htmlFor="ss-product-service">Product / service</Label><Input id="ss-product-service" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
        </div>
        <div><Label htmlFor="ss-call-to-action">Call to action</Label><Input id="ss-call-to-action" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="Shop now at …" /></div>
        <div className="flex items-center gap-3">
          <Button disabled={generating} onClick={generate}>{generating ? "Generating full SEO package…" : "Generate SEO article"}</Button>
          <span className="text-xs text-muted-foreground">≈ {SEO_CREDIT_COSTS.article} credits (real AI) · free with placeholder</span>
        </div>
        {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}
      </Card>
    );
  }

  // ----- Step 2: editor + publish -----
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Article editor</h3>
            <button className="text-xs text-muted-foreground underline" onClick={() => setArticle(null)}>← New article</button>
          </div>
          <div><Label htmlFor="ss-seo-title">SEO title</Label><Input id="ss-seo-title" value={article.seo_title} onChange={(e) => setField("seo_title", e.target.value)} /></div>
          <div><Label htmlFor="ss-meta-description">Meta description</Label><Textarea id="ss-meta-description" rows={2} value={article.meta_description} onChange={(e) => setField("meta_description", e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="ss-slug">Slug</Label><Input id="ss-slug" value={article.slug} onChange={(e) => setField("slug", e.target.value)} /></div>
            <div><Label htmlFor="ss-category">Category</Label><Input id="ss-category" value={article.category} onChange={(e) => setField("category", e.target.value)} /></div>
          </div>
          <div><Label htmlFor="ss-tags">Tags (comma-separated)</Label><Input id="ss-tags" value={article.tags.join(", ")} onChange={(e) => setField("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} /></div>
          <div><Label htmlFor="ss-article-body">Article body (HTML)</Label><Textarea id="ss-article-body" rows={16} value={article.article_content} onChange={(e) => setField("article_content", e.target.value)} className="font-mono text-xs" /></div>
        </Card>

        <Card>
          <h3 className="font-semibold">FAQ</h3>
          <div className="mt-2 space-y-2 text-sm">
            {article.faq_json?.map((f, i) => (<div key={i}><p className="font-medium">{f.q}</p><p className="text-muted-foreground">{f.a}</p></div>))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <h3 className="font-semibold">SEO scores</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center"><div className="text-2xl font-bold">{article.seo_score}</div><div className="text-xs text-muted-foreground">SEO</div></div>
            <div className="rounded-lg bg-muted/50 p-3 text-center"><div className="text-2xl font-bold">{article.readability_score}</div><div className="text-xs text-muted-foreground">Readability</div></div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Scores are placeholders for now.</p>
        </Card>

        <Card className="space-y-3">
          <h3 className="font-semibold">Publish to WordPress</h3>
          {sites.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-center">
              <p className="text-sm text-muted-foreground">No WordPress site connected yet.</p>
              <Button asChild size="sm" variant="accent" className="mt-2">
                <Link href="/dashboard/seo/sites">Connect WordPress</Link>
              </Button>
            </div>
          ) : (
            <select aria-label="WordPress site" className={sel} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.site_name}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            {(["draft", "now", "schedule"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-lg border px-2 py-1.5 text-sm capitalize ${mode === m ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20" : "border-border"}`}>{m === "now" ? "Publish" : m}</button>
            ))}
          </div>
          {mode === "schedule" && <input aria-label="Scheduled publish date and time" type="datetime-local" className={sel} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={busy} onClick={save}>Save draft</Button>
            <Button className="flex-1" disabled={busy} onClick={requestPublish}>{busy ? "Working…" : mode === "now" ? "Publish" : mode === "schedule" ? "Schedule" : "Send draft"}</Button>
          </div>
          {msg && <Alert variant={msg.kind} className="break-all">{msg.text}</Alert>}
        </Card>
      </div>

      <div className="lg:col-span-3">
        <ContentCompletionPanel
          contentType="seo_article"
          title={article.seo_title}
          sourceKind="article"
          sourceId={article.id}
          contentHtml={article.article_content}
          baseMetadata={{ title: article.seo_title, description: article.meta_description }}
          analyticsHref="/dashboard/seo"
        />
      </div>

      <ConfirmDialog
        open={confirmPublish}
        danger={false}
        title={mode === "now" ? "Publish to WordPress?" : mode === "schedule" ? "Schedule on WordPress?" : "Send draft to WordPress?"}
        description={
          mode === "now"
            ? `Publish "${article.seo_title}" live to ${sites.find((s) => s.id === siteId)?.site_name ?? "your site"} now?`
            : mode === "schedule"
              ? `Schedule "${article.seo_title}" on ${sites.find((s) => s.id === siteId)?.site_name ?? "your site"} for ${scheduledAt}?`
              : `Send "${article.seo_title}" as a draft to ${sites.find((s) => s.id === siteId)?.site_name ?? "your site"}?`
        }
        confirmLabel={mode === "now" ? "Publish" : mode === "schedule" ? "Schedule" : "Send draft"}
        loading={busy}
        onConfirm={publish}
        onCancel={() => setConfirmPublish(false)}
      />
    </div>
  );
}
