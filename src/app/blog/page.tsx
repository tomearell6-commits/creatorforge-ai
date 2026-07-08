import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/home/MarketingNav";
import { MarketingFooter } from "@/components/marketing/home/MarketingFooter";
import { PUBLIC_BLOG_COLUMNS, formatBlogDate, type BlogPost } from "@/lib/blog/blog";

export const revalidate = 300; // refresh the list every 5 min

const TITLE = "Blog — CreatorsForge.io";
const DESCRIPTION =
  "Guides, playbooks, and insights on AI content creation, SEO, marketing automation, and growing a business with CreatorsForge.io.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.creatorsforge.io/blog", siteName: "CreatorsForge.io", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

type Card = Pick<BlogPost, "slug" | "title" | "excerpt" | "cover_image_url" | "cover_image_alt" | "tags" | "category" | "author" | "published_at" | "reading_minutes">;

export default async function BlogIndex() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select(PUBLIC_BLOG_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  const posts = (data ?? []) as Card[];
  const [featured, ...rest] = posts;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav isAuthed={false} />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-700">CreatorsForge Blog</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-5xl">
              Grow faster with AI
            </h1>
            <p className="mx-auto mt-3 text-ink-soft dark:text-muted-foreground">{DESCRIPTION}</p>
          </div>

          {posts.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">New articles are coming soon. Check back shortly.</p>
          ) : (
            <>
              {/* Featured (most recent) */}
              <Link
                href={`/blog/${featured.slug}`}
                className="group mb-12 block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-lg"
              >
                <div className="grid md:grid-cols-2">
                  <div className="aspect-video w-full overflow-hidden bg-muted md:aspect-auto">
                    {featured.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={featured.cover_image_url} alt={featured.cover_image_alt ?? featured.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full min-h-48 items-center justify-center bg-gradient-to-br from-brand-500/15 to-brand-700/10 text-brand-700">
                        <span className="text-lg font-bold">CreatorsForge</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center p-6 sm:p-8">
                    {featured.category && <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{featured.category}</span>}
                    <h2 className="mt-2 text-2xl font-bold text-ink dark:text-foreground group-hover:text-brand-700">{featured.title}</h2>
                    {featured.excerpt && <p className="mt-3 line-clamp-3 text-ink-soft dark:text-muted-foreground">{featured.excerpt}</p>}
                    <p className="mt-4 text-sm text-muted-foreground">
                      {featured.author} · {formatBlogDate(featured.published_at)} · {featured.reading_minutes} min read
                    </p>
                  </div>
                </div>
              </Link>

              {/* Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-lg"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      {p.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.cover_image_url} alt={p.cover_image_alt ?? p.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-500/15 to-brand-700/10 text-brand-700">
                          <span className="text-sm font-bold">CreatorsForge</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      {p.category && <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{p.category}</span>}
                      <h3 className="mt-1 text-lg font-bold text-ink dark:text-foreground group-hover:text-brand-700">{p.title}</h3>
                      {p.excerpt && <p className="mt-2 line-clamp-3 text-sm text-ink-soft dark:text-muted-foreground">{p.excerpt}</p>}
                      <p className="mt-4 text-xs text-muted-foreground">{formatBlogDate(p.published_at)} · {p.reading_minutes} min read</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
