import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";

/**
 * Provenance display for a single lead — shows where the contact data came from.
 */
export function LeadSourceCard({
  sourceUrl,
  contactPageUrl,
  className,
}: {
  sourceUrl?: string | null;
  contactPageUrl?: string | null;
  className?: string;
}) {
  return (
    <Card className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</p>
      <div className="mt-2 space-y-1.5 text-sm">
        <SourceLink label="Source URL" href={sourceUrl} />
        <SourceLink label="Contact page" href={contactPageUrl} />
      </div>
    </Card>
  );
}

function SourceLink({ label, href }: { label: string; href?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-[60%] items-center gap-1 truncate text-brand-600 hover:underline"
        >
          <span className="truncate">{href.replace(/^https?:\/\//, "")}</span>
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
}
