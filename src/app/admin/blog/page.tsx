import { AdminBlog } from "@/components/admin/AdminBlog";

export const metadata = { title: "Blog & SEO — Admin" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Blog &amp; SEO</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Write SEO articles with AI and publish them to creatorsforge.io/blog. Published posts are automatically added to your sitemap for Google.
        </p>
      </div>
      <AdminBlog />
    </div>
  );
}
