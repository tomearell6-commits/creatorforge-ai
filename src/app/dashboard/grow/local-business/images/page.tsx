import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LocalBusinessImageGenerator } from "@/components/local-business/LocalBusinessImageGenerator";

export const metadata = { title: "AI Image Generator — Local Business Studio" };

export default function LbImagesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/local-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Local Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">AI Image Generator</h1>
        <p className="mt-1 text-muted-foreground">Generate original branded images for promotions, products, events, and offers. Powered by the Design Studio image engine.</p>
      </div>
      <LocalBusinessImageGenerator />
    </div>
  );
}
