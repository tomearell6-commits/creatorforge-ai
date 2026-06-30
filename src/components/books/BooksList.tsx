"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Star, BookOpen } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type Book = { id: string; title: string; subtitle: string | null; category: string | null; status: string; favorite: boolean; updated_at: string };
const FILTERS = ["all", "draft", "writing", "published", "archived", "favorites"];

export function BooksList() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filter, setFilter] = useState("all");
  function load() { fetch("/api/books").then((r) => r.json()).then((d) => setBooks(d.books ?? [])); }
  useEffect(() => { load(); }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/books", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    load();
  }
  async function remove(id: string) { await fetch(`/api/books?id=${id}`, { method: "DELETE" }); load(); }

  const shown = books.filter((b) => filter === "all" ? true : filter === "favorites" ? b.favorite : b.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-sm capitalize ${filter === f ? "bg-brand-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}>{f}</button>)}
        </div>
        <Button asChild variant="accent"><Link href="/dashboard/books/new"><Plus className="h-4 w-4" /> New book</Link></Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No books here yet"
          description="Start a new book and let AI draft a concept, outline, and chapters for you."
          actionLabel="Start a book"
          href="/dashboard/books/new"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((b) => (
            <Card key={b.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base"><Link href={`/dashboard/books/${b.id}`} className="hover:text-brand-600">{b.title}</Link></CardTitle>
                <button onClick={() => patch(b.id, { favorite: !b.favorite })} title="Favorite"><Star className={`h-4 w-4 ${b.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} /></button>
              </div>
              {b.subtitle && <p className="text-xs text-muted-foreground">{b.subtitle}</p>}
              <Badge variant={b.status === "published" ? "success" : b.status === "archived" ? "default" : "brand"}>{b.status}{b.category ? ` · ${b.category}` : ""}</Badge>
              <div className="mt-auto flex flex-wrap gap-2 pt-1 text-xs">
                <Link href={`/dashboard/books/${b.id}`} className="text-brand-700 hover:underline">Open editor</Link>
                {b.status !== "archived" ? <button onClick={() => patch(b.id, { status: "archived" })} className="text-muted-foreground hover:underline">Archive</button> : <button onClick={() => patch(b.id, { status: "draft" })} className="text-muted-foreground hover:underline">Restore</button>}
                <button onClick={() => remove(b.id)} className="text-red-600 hover:underline">Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
