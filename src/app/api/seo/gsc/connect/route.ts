import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/respond";
import { authorizeUrl, gscConfigured } from "@/lib/gsc/google";

/** Start connecting a Google account (read-only Search Console). Sets a one-time state cookie, checked in the callback. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!gscConfigured()) {
    return NextResponse.json({ available: false, message: "Google Search Console isn't set up on this server yet (missing Google client keys)." });
  }
  const state = crypto.randomUUID();
  const res = NextResponse.json({ available: true, authorizeUrl: authorizeUrl(state) });
  res.cookies.set("gsc_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return res;
}
