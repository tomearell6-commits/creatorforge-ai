import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-bold", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <Flame className="h-5 w-5" />
      </span>
      <span className="text-lg tracking-tight">CreatorForge AI</span>
    </Link>
  );
}
