import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.creatorsforge.io"),
  title: {
    default: "CreatorForge AI — AI Content Creation Platform",
    template: "%s · CreatorForge AI",
  },
  description:
    "Generate scripts, voiceovers, captions, and faceless videos for any niche. Built for creators, marketers, and agencies.",
  applicationName: "CreatorForge AI",
  openGraph: {
    title: "CreatorForge AI — AI Content Creation Platform",
    description:
      "Generate scripts, voiceovers, captions, and faceless videos for any niche.",
    url: "https://www.creatorsforge.io",
    siteName: "CreatorForge AI",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CreatorForge AI",
    description: "AI scripts, voiceovers, captions, and faceless videos for any niche.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
