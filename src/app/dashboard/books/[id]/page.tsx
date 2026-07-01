import { BookEditor } from "@/components/books/BookEditor";
export const metadata = { title: "Editor — CreatorsForge AI" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-6xl">
      <BookEditor bookId={id} />
    </div>
  );
}
