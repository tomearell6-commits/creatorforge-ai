"use client";

import { useEffect, useState } from "react";

type Book = { id: string; title: string };

/** Small reusable "choose a book" dropdown used by Marketing/Export/Cover pages. */
export function BookPicker({ value, onChange }: { value: string; onChange: (id: string, title: string) => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  useEffect(() => {
    fetch("/api/books").then((r) => r.json()).then((d) => {
      const list: Book[] = d.books ?? [];
      setBooks(list);
      if (!value && list[0]) onChange(list[0].id, list[0].title);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (books.length === 0) return <p className="text-sm text-muted-foreground">No books yet — create one first.</p>;
  return (
    <select value={value} onChange={(e) => { const b = books.find((x) => x.id === e.target.value); onChange(e.target.value, b?.title ?? ""); }} className="h-10 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-sm">
      {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
    </select>
  );
}
