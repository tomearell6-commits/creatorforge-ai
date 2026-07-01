import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.creatorsforge.io"),
  title: {
    default: "CreatorsForge AI — AI Content Creation Platform",
    template: "%s · CreatorsForge AI",
  },
  description:
    "Generate scripts, voiceovers, captions, and faceless videos for any niche. Built for creators, marketers, and agencies.",
  applicationName: "CreatorsForge AI",
  openGraph: {
    title: "CreatorsForge AI — AI Content Creation Platform",
    description:
      "Generate scripts, voiceovers, captions, and faceless videos for any niche.",
    url: "https://www.creatorsforge.io",
    siteName: "CreatorsForge AI",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CreatorsForge AI",
    description: "AI scripts, voiceovers, captions, and faceless videos for any niche.",
  },
};

// Applies the saved theme before paint to avoid a flash of the wrong theme.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
