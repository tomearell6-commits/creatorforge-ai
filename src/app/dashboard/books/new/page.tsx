import { Suspense } from "react";
import { BookWizard } from "@/components/books/BookWizard";
export const metadata = { title: "New Book — CreatorsForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Start a new book</h1><p className="mt-1 text-muted-foreground">Set the basics, then let AI draft a concept and chapter outline — or start from a blank manuscript.</p></div>
      <Suspense fallback={null}><BookWizard /></Suspense>
    </div>
  );
}
