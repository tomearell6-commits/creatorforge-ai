import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildExport, NATIVE_EXPORT_FORMATS } from "@/lib/books/export";

/**
 * GET /api/books/export?bookId=&format=txt|md|html|doc
 * Assembles the book and returns it as a download. Text-based exports are free
 * (no AI). epub/docx native packaging needs a zip lib (roadmap); use html/doc or
 * print-to-PDF in the browser meanwhile.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId");
  const format = (url.searchParams.get("format") || "md").toLowerCase();
  if (!bookId) return NextResponse.json({ error: "Missing bookId." }, { status: 400 });
  if (!NATIVE_EXPORT_FORMATS.includes(format)) {
    return NextResponse.json({ error: `${format.toUpperCase()} export isn't available yet. Use TXT, MD, HTML, or DOC — or print to PDF from the browser.` }, { status: 400 });
  }

  const { data: book } = await supabase.from("books").select("title, subtitle, author_name").eq("id", bookId).eq("user_id", user.id).maybeSingle();
  if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const { data: chapters } = await supabase.from("book_chapters").select("title, content, position").eq("book_id", bookId).eq("user_id", user.id).order("position");

  const { body, contentType, ext } = buildExport(book, chapters ?? [], format);
  await supabase.from("book_exports").insert({ book_id: bookId, user_id: user.id, format, status: "ready" });

  const filename = `${book.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 50) || "book"}.${ext}`;
  return new NextResponse(body, {
    headers: { "Content-Type": contentType, "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
