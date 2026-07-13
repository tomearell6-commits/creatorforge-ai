/**
 * POST /api/local-business/connect
 * Starts the Google Business Profile connection. Returns an official Google
 * OAuth authorize URL when the Business Profile API is configured + approved;
 * otherwise returns an honest "not available yet" response. NEVER simulates a
 * successful connection.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gbpApiConfigured, logLbConnection } from "@/lib/local-business/service";

const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!gbpApiConfigured()) {
    await logLbConnection(supabase, user.id, null, "connect_unavailable", "GBP API not configured/approved");
    return NextResponse.json({
      available: false,
      message: "Google Business Profile connection isn't enabled yet. It requires a Google Cloud project with approved access to the Business Profile APIs. Ask your admin to complete the Google setup, then reconnect.",
    });
  }

  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.creatorsforge.io"}/api/local-business/callback`;
  const state = crypto.randomUUID();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GBP_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  await logLbConnection(supabase, user.id, null, "connect_started");
  return NextResponse.json({ available: true, authorizeUrl: url.toString() });
}
