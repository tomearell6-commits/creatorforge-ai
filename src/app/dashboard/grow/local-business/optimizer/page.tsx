import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProfileOptimizer } from "@/components/local-business/ProfileOptimizer";

export const metadata = { title: "Profile Optimizer — Local Business Studio" };

export default function ProfileOptimizerPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/grow/local-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Local Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Profile Optimizer</h1>
        <p className="mt-1 text-muted-foreground">Improve individual profile sections with AI. Review the recommendation, then apply it manually to your profile.</p>
      </div>
      <ProfileOptimizer />
    </div>
  );
}
