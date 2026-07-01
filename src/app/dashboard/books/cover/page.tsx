import { BookCover } from "@/components/books/BookCover";
export const metadata = { title: "Cover Studio — CreatorsForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-bold">Cover Studio</h1><p className="mt-1 text-muted-foreground">Design original cover artwork for your book with AI.</p></div>
      <BookCover />
    </div>
  );
}
