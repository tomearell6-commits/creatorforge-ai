import { BookTemplates } from "@/components/books/BookTemplates";
export const metadata = { title: "Book Templates — CreatorsForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">Book Templates</h1><p className="mt-1 text-muted-foreground">Start from a proven structure. Pick a template to pre-fill your new book.</p></div>
      <BookTemplates />
    </div>
  );
}
