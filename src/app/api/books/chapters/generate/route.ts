import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { BOOK_CREDIT_COSTS } from "@/lib/constants";
import { generateChapter, chapterTool, willUseRealBookAI, type BookMeta, type ChapterAction } from "@/lib/books/generate";

/**
 * POST /api/books/chapters/generate
 *   { chapterId, action? , extra? }
 * action absent → draft the whole chapter (BOOK_CREDIT_COSTS.chapter).
 * action present → rewrite/expand/improve/etc. (BOOK_CREDIT_COSTS.chapterTool).
 * Charges only when real AI runs; saves a version snapshot before replacing.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "book-chapter", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Please wait a moment." }, { status: 429 });

  const { chapterId, action, extra } = (await request.json().catch(() => ({}))) as { chapterId?: string; action?: ChapterAction; extra?: string };
  if (!chapterId) return NextResponse.json({ error: "Missing chapterId." }, { status: 400 });

  const { data: ch } = await supabase.from("book_chapters").select("*, books!inner(*)").eq("id", chapterId).eq("user_id", user.id).maybeSingle();
  if (!ch) return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  const book = (ch as { books: BookMeta }).books;

  const billable = willUseRealBookAI();
  const cost = action ? BOOK_CREDIT_COSTS.chapterTool : BOOK_CREDIT_COSTS.chapter;
  if (billable && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits", needed: cost }, { status: 402 });
  }

  let content: string, usedAI: boolean;
  if (action) {
    if (!ch.content?.trim()) return NextResponse.json({ error: "Write or generate the chapter first." }, { status: 400 });
    const r = await chapterTool(action, ch.content, book, extra);
    content = r.content; usedAI = r.usedAI;
  } else {
    const r = await generateChapter(book, ch.title, ch.notes ?? undefined);
    content = r.content; usedAI = r.usedAI;
  }
  if (billable && usedAI) await deductCredits(cost, action ? `book_chapter_${action}` : "book_chapter");

  // Snapshot the prior content, then save the new content.
  if (ch.content) await supabase.from("book_versions").insert({ chapter_id: chapterId, user_id: user.id, content: ch.content, label: `before ${action ?? "generate"}` });
  const word_count = content.trim() ? content.trim().split(/\s+/).length : 0;
  await supabase.from("book_chapters").update({ content, word_count, status: "written", updated_at: new Date().toISOString() }).eq("id", chapterId);

  return NextResponse.json({ content, usedAI, creditCost: billable && usedAI ? cost : 0 });
}
