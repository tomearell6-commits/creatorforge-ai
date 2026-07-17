import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on everything except static assets, image files, and published Build
  // Studio sites (/s/*) — those are public, sandboxed, and must never touch the
  // app session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|s/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|xml|ico)$).*)"],
};
