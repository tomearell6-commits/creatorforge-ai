/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage public URLs (Phase 4 — generated media lives here).
      { protocol: "https", hostname: "*.supabase.co" },
      // Placeholder image provider source (fetched server-side, then re-hosted).
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
