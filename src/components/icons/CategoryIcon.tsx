import {
  Ghost, Flame, Sparkles, TrendingUp, ShoppingBag, GraduationCap, Baby, Bot,
  DollarSign, Heart, Mic, FileText, MessageSquare, Folder, type LucideIcon,
} from "lucide-react";

/**
 * One Lucide glyph per content category (keyed by CATEGORIES[].slug), replacing
 * the ad-hoc emoji that used to badge project categories. Decorative by default.
 */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  "horror-stories": Ghost,
  "motivational": Flame,
  "anime-stories": Sparkles,
  "business-marketing": TrendingUp,
  "product-ads": ShoppingBag,
  "educational": GraduationCap,
  "kids-stories": Baby,
  "ai-news": Bot,
  "finance": DollarSign,
  "relationship-stories": Heart,
  "podcast-scripts": Mic,
  "blog-posts": FileText,
  "social-captions": MessageSquare,
};

export function CategoryIcon({ slug, className = "h-5 w-5" }: { slug?: string; className?: string }) {
  const Icon = (slug && CATEGORY_ICON[slug]) || Folder;
  return <Icon className={className} aria-hidden />;
}

export function hasCategoryIcon(slug: string): boolean {
  return slug in CATEGORY_ICON;
}
