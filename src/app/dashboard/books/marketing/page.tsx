import { Suspense } from "react";
import { BookMarketing } from "@/components/books/BookMarketing";
export const metadata = { title: "Book Marketing — CreatorsForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-bold">Book Marketing</h1><p className="mt-1 text-muted-foreground">Generate launch copy, connect your accounts, and run ads — descriptions, blurbs, keywords, social posts, emails, and paid campaigns.</p></div>
      <Suspense fallback={<div className="py-10 text-sm text-muted-foreground">Loading…</div>}>
        <BookMarketing />
      </Suspense>
    </div>
  );
}
