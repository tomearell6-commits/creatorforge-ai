import { BooksList } from "@/components/books/BooksList";
export const metadata = { title: "Publishing Studio — CreatorsForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">Publishing Studio</h1><p className="mt-1 text-muted-foreground">Write, edit, design, export, and market original books — end to end, with AI assistance.</p></div>
      <BooksList />
    </div>
  );
}
