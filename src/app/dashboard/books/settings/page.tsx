import { BookSettings } from "@/components/books/BookSettings";
export const metadata = { title: "Publishing Settings — CreatorForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Publishing Settings</h1><p className="mt-1 text-muted-foreground">Credit costs and privacy for the Publishing Studio.</p></div>
      <BookSettings />
    </div>
  );
}
