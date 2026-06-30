import { BookMarketing } from "@/components/books/BookMarketing";
export const metadata = { title: "Book Marketing — CreatorForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-bold">Book Marketing</h1><p className="mt-1 text-muted-foreground">Generate launch copy — descriptions, blurbs, store keywords, social posts, emails, and more.</p></div>
      <BookMarketing />
    </div>
  );
}
