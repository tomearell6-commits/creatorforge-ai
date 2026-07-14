import { Suspense } from "react";
import { BookExport } from "@/components/books/BookExport";
export const metadata = { title: "Export Center — CreatorsForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Export Center</h1><p className="mt-1 text-muted-foreground">Download your finished manuscript in the format you need.</p></div>
      <Suspense fallback={<div className="py-10 text-sm text-muted-foreground">Loading…</div>}>
        <BookExport />
      </Suspense>
    </div>
  );
}
