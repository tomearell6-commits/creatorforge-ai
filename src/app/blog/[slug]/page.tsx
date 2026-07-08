import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/home/MarketingNav";
import { MarketingFooter } from "@/components/marketing/home/MarketingFooter";
import { PUBLIC_BLOG_COLUMNS, sanitizeBlogHtml, formatBlogDate, type BlogPost, type BlogFaq } from "@/lib/blog/blog";

export const revalidate = 300;

const BASE = "https://www.creatorsforge.io";

type Article = Pick<
  BlogPost,
  "slug" | "title" | "meta_title" | "meta_description" | "excerpt" | "content_html" | "cover_image_url" | "cover_image_alt" | "tags" | "category" | "faq_json" | "author" | "published_at" | "updated_at" | "reading_minutes"
>;

async function getPost(slug: string): Promise<Article | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select(PUBLIC_BLOG_COLUMNS + ",updated_at")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  return (data as unknown as Article) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article not found — CreatorsForge.io" };
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || undefined;
  const url = `${BASE}/blog/${post.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      url,
      siteName: "CreatorsForge.io",
      type: "article",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at ?? undefined,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description: description ?? "", images: post.cover_image_url ? [post.cover_image_url] : undefined },
  };
}

export default async function BlogArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const faq = Array.isArray(post.faq_json) ? (post.faq_json as BlogFaq[]) : [];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.meta_description || post.excerpt || undefined,
        image: post.cover_image_url || undefined,
        datePublished: post.published_at || undefined,
        dateModified: post.updated_at || post.published_at || undefined,
        author: { "@type": "Organization", name: "CreatorsForge.io", url: BASE },
        publisher: { "@type": "Organization", name: "CreatorsForge.io", url: BASE },
        mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE}/blog/${post.slug}` },
      },
      ...(faq.length
        ? [{
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }]
        : []),
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingNav isAuthed={false} />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-12">
          <Link href="/blog" className="text-sm font-semibold text-brand-600 hover:underline">← All articles</Link>
          {post.category && <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-brand-600">{post.category}</p>}
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink dark:text-foreground">{post.title}</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {post.author} · {formatBlogDate(post.published_at)} · {post.reading_minutes} min read
          </p>
          {post.cover_image_url && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover_image_url} alt={post.cover_image_alt ?? post.title} className="w-full object-cover" />
            </div>
          )}

          <div
            className="blog-content mt-8"
            dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content_html) }}
          />

          {faq.length > 0 && (
            <section className="mt-12 border-t border-border pt-8">
              <h2 className="text-2xl font-bold text-ink dark:text-foreground">Frequently asked questions</h2>
              <dl className="mt-6 space-y-6">
                {faq.map((f, i) => (
                  <div key={i}>
                    <dt className="font-semibold text-ink dark:text-foreground">{f.q}</dt>
                    <dd className="mt-1 text-ink-soft dark:text-muted-foreground">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">#{t}</span>
              ))}
            </div>
          )}

          {/* Conversion CTA */}
          <div className="mt-12 rounded-2xl border border-brand-200 bg-brand-50 p-8 text-center dark:border-brand-900/40 dark:bg-brand-950/20">
            <h3 className="text-xl font-bold text-ink dark:text-foreground">Ready to build with AI?</h3>
            <p className="mt-2 text-ink-soft dark:text-muted-foreground">CreatorsForge turns one idea into finished content, published and measured — automatically.</p>
            <Link href="/signup" className="mt-5 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700">
              Start free
            </Link>
          </div>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
