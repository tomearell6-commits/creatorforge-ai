import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { BOOK_CREDIT_COSTS } from "@/lib/constants";
import { generateConcept, generateOutline, willUseRealBookAI, type BookMeta } from "@/lib/books/generate";

/**
 * POST /api/books/outline { bookId, chapters? }
 * Generates the concept + outline and creates chapter rows. Charges outline +
 * concept credits only when real AI runs.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "book-outline", 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Please wait a moment." }, { status: 429 });

  const { bookId, chapters } = (await request.json().catch(() => ({}))) as { bookId?: string; chapters?: number };
  if (!bookId) return NextResponse.json({ error: "Missing bookId." }, { status: 400 });
  const { data: book } = await supabase.from("books").select("*").eq("id", bookId).eq("user_id", user.id).maybeSingle();
  if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });

  const billable = willUseRealBookAI();
  const cost = BOOK_CREDIT_COSTS.outline + BOOK_CREDIT_COSTS.concept;
  if (billable && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits", needed: cost }, { status: 402 });
  }

  const meta = book as BookMeta;
  const concept = await generateConcept(meta);
  const outline = await generateOutline(meta, Math.min(Math.max(chapters ?? 10, 3), 30));
  const usedAI = concept.usedAI || outline.usedAI;
  if (billable && usedAI) await deductCredits(cost, "book_outline");

  // Save concept onto the book + the outline, and create chapter rows.
  await supabase.from("books").update({
    concept: concept.data.concept, description: concept.data.description,
    objectives: concept.data.objectives, usps: concept.data.usps, status: "writing", updated_at: new Date().toISOString(),
  }).eq("id", bookId);
  await supabase.from("book_outlines").insert({ book_id: bookId, user_id: user.id, outline_json: outline.data });

  // Flatten outline → chapter rows (replace any existing for a clean regenerate).
  await supabase.from("book_chapters").delete().eq("book_id", bookId).eq("user_id", user.id);
  let pos = 0;
  const rows = outline.data.parts.flatMap((part) => part.chapters.map((ch) => ({
    book_id: bookId, user_id: user.id, position: pos++, part: part.title, title: ch.title,
    content: "", notes: (ch.objectives ?? []).join(" • "), status: "draft", word_count: 0,
  })));
  if (rows.length) await supabase.from("book_chapters").insert(rows);

  return NextResponse.json({ concept: concept.data, outline: outline.data, chapters: rows.length, usedAI, creditCost: billable && usedAI ? cost : 0 });
}
