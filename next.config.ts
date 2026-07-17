import type { NextConfig } from "next";

// Security headers applied to every response (Phase 8 — Module 3).
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Standalone output for slim Docker production images (Phase 8 — Module 8).
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  async headers() {
    // Apply the full security set everywhere EXCEPT the user-published sites
    // under /s/*. Those must be framable by our own dashboard for the in-app
    // preview, so they can't carry X-Frame-Options: SAMEORIGIN (the dashboard
    // and the sites live on different origins). The /s route sets its own
    // headers, restricting framing precisely via CSP frame-ancestors instead.
    return [{ source: "/((?!s/).*)", headers: securityHeaders }];
  },
};

export default nextConfig;
