import { Globe } from "lucide-react";
import { BrandIcon, hasBrandIcon } from "./BrandIcon";

/**
 * One icon for any social/publishing platform. Uses the official BrandIcon when
 * available (youtube, tiktok, instagram, facebook, linkedin, x, pinterest,
 * wordpress, …) and falls back to a neutral globe for anything unmapped.
 * Decorative by default; pass `title` to expose a labelled mark.
 */
export function PlatformIcon({
  platform,
  className = "h-4 w-4",
  title,
  monochrome = false,
}: {
  platform?: string;
  className?: string;
  title?: string;
  monochrome?: boolean;
}) {
  const key = platform?.toLowerCase() ?? "";
  if (hasBrandIcon(key)) return <BrandIcon platform={key} className={className} title={title} monochrome={monochrome} />;
  return <Globe className={className} aria-hidden={title ? undefined : true} aria-label={title} role={title ? "img" : undefined} />;
}
