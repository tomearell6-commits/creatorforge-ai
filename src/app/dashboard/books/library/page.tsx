import { BooksList } from "@/components/books/BooksList";
export const metadata = { title: "My Books — CreatorForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">My Books</h1><p className="mt-1 text-muted-foreground">All your manuscripts — drafts, in-progress, published, and archived.</p></div>
      <BooksList />
    </div>
  );
}
