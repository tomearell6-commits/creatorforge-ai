import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Host that serves user-published sites, when a dedicated domain is configured
 *  (SITES_BASE_URL). Keeping user content on its own domain is what isolates it
 *  from creatorsforge.io's cookies and brand/reputation. */
const sitesHost = (() => {
  try {
    return process.env.SITES_BASE_URL ? new URL(process.env.SITES_BASE_URL).host : null;
  } catch {
    return null;
  }
})();

/** Hosts that belong to US — everything else arriving here is a customer's own
 *  domain pointed at a published site. */
function isOwnHost(host: string): boolean {
  const app = (() => { try { return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.creatorsforge.io").host; } catch { return "www.creatorsforge.io"; } })();
  return (
    host === app ||
    host === sitesHost ||
    host.endsWith(".vercel.app") ||
    host.startsWith("localhost") ||
    host.endsWith(".creatorsforge.io") ||
    host === "creatorsforge.io"
  );
}

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];

  // On the dedicated sites domain, ONLY published sites are served — never the
  // app. Anything else bounces to the real app so the two never blur together.
  if (sitesHost && host === sitesHost) {
    if (!request.nextUrl.pathname.startsWith("/s/")) {
      const app = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.creatorsforge.io";
      return NextResponse.redirect(new URL(request.nextUrl.pathname, app));
    }
    return NextResponse.next();
  }

  // A customer's own domain: serve THEIR site from the root. /s/by-host/{host}
  // resolves the hostname to a published site and renders it (still sandboxed).
  if (host && !isOwnHost(host)) {
    const path = request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname;
    return NextResponse.rewrite(new URL(`/s/by-host/${encodeURIComponent(host)}${path}`, request.url));
  }

  return await updateSession(request);
}

export const config = {
  // Run on everything except static assets, image files, and published Build
  // Studio sites (/s/*) — those are public, sandboxed, and must never touch the
  // app session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|s/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|xml|ico)$).*)"],
};
