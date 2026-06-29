import Link from "next/link";
import { cn } from "@/lib/utils";

/** CreatorForge wordmark — dark ink tile with a lime "play/spark" mark. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-bold", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="#bef264" />
        </svg>
      </span>
      <span className="text-lg tracking-tight text-ink dark:text-foreground">
        CreatorForge<span className="text-brand-500">.io</span>
      </span>
    </Link>
  );
}
