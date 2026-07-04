import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  TWO_FACTOR_COOKIE,
  verifyTwoFactorCookie,
  verifyOffMarker,
  issueOffMarker,
  twoFactorCookieAvailable,
} from "@/lib/security/twofactor-cookie";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the Supabase auth session on every request and guards
 * the /dashboard area. Called from src/middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect the dashboard: redirect unauthenticated users to /login.
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Second factor: users with 2FA enabled must verify this browser before the
  // dashboard loads. A signed cookie proves verification; a short-lived signed
  // "off" marker avoids re-querying the DB for users without 2FA.
  if (isDashboard && user && twoFactorCookieAvailable()) {
    const cookieVal = request.cookies.get(TWO_FACTOR_COOKIE)?.value;
    const verified = await verifyTwoFactorCookie(cookieVal, user.id);
    if (!verified) {
      const markedOff = await verifyOffMarker(cookieVal, user.id);
      if (!markedOff) {
        const { data: tfa } = await supabase
          .from("user_2fa_settings")
          .select("enabled")
          .eq("user_id", user.id)
          .maybeSingle();
        if (tfa?.enabled) {
          const url = request.nextUrl.clone();
          url.pathname = "/two-factor";
          url.search = "";
          url.searchParams.set("redirect", request.nextUrl.pathname);
          return NextResponse.redirect(url);
        }
        const off = await issueOffMarker(user.id);
        if (off) {
          supabaseResponse.cookies.set(TWO_FACTOR_COOKIE, off, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 10 * 60,
            path: "/",
          });
        }
      }
    }
  }

  return supabaseResponse;
}
