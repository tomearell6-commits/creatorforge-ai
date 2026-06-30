import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { BOOK_CREDIT_COSTS } from "@/lib/constants";
import { generateMarketing, willUseRealBookAI, type BookMeta } from "@/lib/books/generate";

/** GET ?bookId= — saved marketing assets. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookId = new URL(request.url).searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ error: "Missing bookId." }, { status: 400 });
  const { data } = await supabase.from("book_marketing_assets").select("id, asset_type, content, created_at").eq("book_id", bookId).eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ assets: data ?? [] });
}

/** POST { bookId, type } — generate + save a marketing asset (charged when real AI). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { bookId, type } = (await request.json().catch(() => ({}))) as { bookId?: string; type?: string };
  if (!bookId || !type) return NextResponse.json({ error: "bookId and type are required." }, { status: 400 });

  const { data: book } = await supabase.from("books").select("*").eq("id", bookId).eq("user_id", user.id).maybeSingle();
  if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });

  const billable = willUseRealBookAI();
  if (billable && (await getCreditBalance()) < BOOK_CREDIT_COSTS.marketing) {
    return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits", needed: BOOK_CREDIT_COSTS.marketing }, { status: 402 });
  }

  const { content, usedAI } = await generateMarketing(book as BookMeta, type);
  if (billable && usedAI) await deductCredits(BOOK_CREDIT_COSTS.marketing, `book_marketing_${type}`);
  await supabase.from("book_marketing_assets").insert({ book_id: bookId, user_id: user.id, asset_type: type, content });

  return NextResponse.json({ content, usedAI, creditCost: billable && usedAI ? BOOK_CREDIT_COSTS.marketing : 0 });
}
