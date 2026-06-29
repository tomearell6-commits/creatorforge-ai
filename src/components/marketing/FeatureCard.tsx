import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function FeatureCard({ title, desc, tint, emoji, href = "/signup" }: { title: string; desc: string; tint: string; emoji: string; href?: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className={`flex h-40 items-center justify-center bg-gradient-to-br ${tint}`}>
        <span className="text-5xl">{emoji}</span>
      </div>
      <div className="space-y-3 p-5">
        <h3 className="text-lg font-bold text-ink dark:text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
        <Button asChild variant="accent" size="sm"><Link href={href}>Try Now</Link></Button>
      </div>
    </div>
  );
}
