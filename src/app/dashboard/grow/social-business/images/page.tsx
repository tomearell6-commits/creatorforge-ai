import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SocialImageGenerator } from "@/components/social-business/SocialImageGenerator";

export const metadata = { title: "AI Image Studio — Social Business Studio" };

export default function SocialImagesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">AI Image Studio</h1>
        <p className="mt-1 text-muted-foreground">Generate original branded graphics at platform dimensions. Powered by the Design Studio image engine.</p>
      </div>
      <SocialImageGenerator />
    </div>
  );
}
