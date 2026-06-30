import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getImageProvider } from "@/lib/media/providers";
import { uploadMedia } from "@/lib/media/storage";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { BOOK_CREDIT_COSTS } from "@/lib/constants";

/** GET ?bookId= — saved covers for a book (newest first). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookId = new URL(request.url).searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ error: "Missing bookId." }, { status: 400 });
  const { data } = await supabase.from("book_covers").select("id, prompt, style, image_url, created_at").eq("book_id", bookId).eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ covers: data ?? [] });
}

/**
 * POST { bookId, prompt, style? } — generate a cover image, store it, save a
 * book_covers row, and set books.cover_url. Charged only when a real image
 * provider runs (placeholder is free).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId, prompt, style } = (await request.json().catch(() => ({}))) as { bookId?: string; prompt?: string; style?: string };
  if (!bookId || !prompt) return NextResponse.json({ error: "bookId and prompt are required." }, { status: 400 });

  const { data: book } = await supabase.from("books").select("id, title").eq("id", bookId).eq("user_id", user.id).maybeSingle();
  if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });

  const provider = getImageProvider();
  const billable = provider.id !== "placeholder";
  if (billable && (await getCreditBalance()) < BOOK_CREDIT_COSTS.cover) {
    return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits", needed: BOOK_CREDIT_COSTS.cover }, { status: 402 });
  }

  const fullPrompt = `Original book cover art for "${book.title}". ${style ? `Style: ${style}. ` : ""}${prompt}. Portrait 2:3 aspect, no text, no logos, original artwork.`;
  let upload;
  try {
    const result = await provider.generate({ prompt: fullPrompt, seed: `${bookId}:${prompt}` });
    upload = await uploadMedia(supabase, { userId: user.id, type: "image", bytes: result.data, contentType: result.contentType, ext: result.contentType.includes("png") ? "png" : "jpg" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Cover generation failed." }, { status: 502 });
  }

  await supabase.from("book_covers").insert({ book_id: bookId, user_id: user.id, prompt, style: style ?? null, image_url: upload.url });
  await supabase.from("books").update({ cover_url: upload.url, updated_at: new Date().toISOString() }).eq("id", bookId).eq("user_id", user.id);

  const creditsRemaining = billable ? await deductCredits(BOOK_CREDIT_COSTS.cover, "book_cover") : null;
  return NextResponse.json({ url: upload.url, creditsRemaining, creditCost: billable ? BOOK_CREDIT_COSTS.cover : 0 });
}
