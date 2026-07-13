import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SocialProfileOptimizer } from "@/components/social-business/SocialProfileOptimizer";

export const metadata = { title: "Profile Optimization — Social Business Studio" };

export default function SocialProfileOptimizationPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Profile Optimization</h1>
        <p className="mt-1 text-muted-foreground">Get a Profile Health score, spot missing info, and generate a stronger bio, description, and CTA. Not a growth or ranking guarantee.</p>
      </div>
      <SocialProfileOptimizer />
    </div>
  );
}
