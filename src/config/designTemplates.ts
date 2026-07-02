/**
 * Design Studio starter template catalogue. These ship with the app so the
 * template gallery is never empty; admins can add more into the
 * `design_templates` table (which takes precedence / augments this list).
 * Each template's `layersJson` is a valid DesignLayer[] snapshot the editor
 * can load directly.
 */
import type { DesignLayerData } from "@/lib/design/types";

export type DesignTemplate = {
  id: string;
  name: string;
  category: string;        // DesignCategory.slug
  group: string;           // DesignGroup.id
  format: string;          // DesignFormat.id
  width: number;
  height: number;
  previewUrl?: string;
  layersJson: DesignLayerData[];
  brandCompatible: boolean;
  creditsRequired: number;
  supportedExports: string[];
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  industry?: string;
  style?: string;
  isPremium: boolean;
  isFeatured: boolean;
};

function baseLayers(headline: string, sub: string, bg = "#0f172a", fg = "#ffffff", accent = "#84cc16"): DesignLayerData[] {
  return [
    {
      layerType: "background", layerName: "Background",
      positionX: 0, positionY: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0,
      styleJson: { fill: bg }, contentJson: {}, locked: true, visible: true,
    },
    {
      layerType: "shape", layerName: "Accent Bar",
      positionX: 8, positionY: 78, width: 30, height: 2, rotation: 0, opacity: 1, zIndex: 1,
      styleJson: { fill: accent, radius: 4 }, contentJson: { kind: "rect" }, locked: false, visible: true,
    },
    {
      layerType: "text", layerName: "Headline",
      positionX: 8, positionY: 30, width: 84, height: 30, rotation: 0, opacity: 1, zIndex: 2,
      styleJson: { color: fg, fontSize: 64, fontWeight: 800, fontFamily: "Inter", align: "left" },
      contentJson: { text: headline }, locked: false, visible: true,
    },
    {
      layerType: "text", layerName: "Subhead",
      positionX: 8, positionY: 62, width: 70, height: 12, rotation: 0, opacity: 0.85, zIndex: 3,
      styleJson: { color: fg, fontSize: 28, fontWeight: 400, fontFamily: "Inter", align: "left" },
      contentJson: { text: sub }, locked: false, visible: true,
    },
  ];
}

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: "tpl-ig-bold-quote", name: "Bold Quote Post", category: "instagram-post", group: "social",
    format: "square-1-1", width: 1080, height: 1080,
    layersJson: baseLayers("Make it\nhappen.", "Daily motivation", "#111827", "#ffffff", "#84cc16"),
    brandCompatible: true, creditsRequired: 0, supportedExports: ["png", "jpg", "pdf"],
    tags: ["quote", "motivation", "social"], difficulty: "beginner", style: "bold",
    isPremium: false, isFeatured: true,
  },
  {
    id: "tpl-yt-thumb-tech", name: "Tech YouTube Thumbnail", category: "youtube-thumbnail", group: "social",
    format: "landscape-16-9", width: 1920, height: 1080,
    layersJson: baseLayers("THE FUTURE\nOF AI", "Watch now", "#0b1020", "#ffffff", "#38bdf8"),
    brandCompatible: true, creditsRequired: 0, supportedExports: ["png", "jpg"],
    tags: ["youtube", "thumbnail", "tech"], difficulty: "beginner", style: "tech",
    isPremium: false, isFeatured: true,
  },
  {
    id: "tpl-fb-ad-sale", name: "Sale Announcement Ad", category: "facebook-ad", group: "advertising",
    format: "square-1-1", width: 1080, height: 1080,
    layersJson: baseLayers("50% OFF\nTODAY", "Limited time only", "#7c2d12", "#fff7ed", "#f97316"),
    brandCompatible: true, creditsRequired: 0, supportedExports: ["png", "jpg", "pdf"],
    tags: ["ad", "sale", "ecommerce"], difficulty: "beginner", style: "ecommerce",
    isPremium: false, isFeatured: true,
  },
  {
    id: "tpl-book-cover-minimal", name: "Minimal Book Cover", category: "book-cover", group: "publishing",
    format: "pin-2-3", width: 1000, height: 1500,
    layersJson: baseLayers("The Quiet\nAdvantage", "A NOVEL", "#f8fafc", "#0f172a", "#0f172a"),
    brandCompatible: true, creditsRequired: 0, supportedExports: ["png", "jpg", "pdf"],
    tags: ["book", "cover", "minimal"], difficulty: "intermediate", style: "minimal",
    isPremium: false, isFeatured: false,
  },
  {
    id: "tpl-logo-wordmark", name: "Wordmark Logo Concept", category: "logo-concept", group: "brand",
    format: "square-1-1", width: 1080, height: 1080,
    layersJson: baseLayers("FORGE", "brand studio", "#ffffff", "#0f172a", "#84cc16"),
    brandCompatible: true, creditsRequired: 0, supportedExports: ["png", "jpg", "svg"],
    tags: ["logo", "brand", "wordmark"], difficulty: "advanced", style: "minimal",
    isPremium: true, isFeatured: true,
  },
  {
    id: "tpl-product-promo", name: "Product Promo Banner", category: "product-promo-banner", group: "ecommerce",
    format: "wide-2-1", width: 1500, height: 750,
    layersJson: baseLayers("New Arrival", "Shop the collection", "#1e1b4b", "#ffffff", "#a78bfa"),
    brandCompatible: true, creditsRequired: 0, supportedExports: ["png", "jpg"],
    tags: ["ecommerce", "banner", "promo"], difficulty: "beginner", style: "ecommerce",
    isPremium: false, isFeatured: false,
  },
  {
    id: "tpl-pitch-deck-cover", name: "Pitch Deck Cover", category: "pitch-deck", group: "business",
    format: "landscape-16-9", width: 1920, height: 1080,
    layersJson: baseLayers("Series A\nDeck", "Confidential — 2026", "#0f172a", "#ffffff", "#22d3ee"),
    brandCompatible: true, creditsRequired: 0, supportedExports: ["png", "jpg", "pdf"],
    tags: ["business", "deck", "corporate"], difficulty: "intermediate", style: "corporate",
    isPremium: false, isFeatured: false,
  },
  {
    id: "tpl-blog-featured", name: "Blog Featured Image", category: "blog-featured-image", group: "website",
    format: "landscape-16-9", width: 1920, height: 1080,
    layersJson: baseLayers("10 SEO Tips\nThat Work", "Read the guide", "#052e16", "#ecfdf5", "#84cc16"),
    brandCompatible: true, creditsRequired: 0, supportedExports: ["png", "jpg"],
    tags: ["blog", "seo", "featured"], difficulty: "beginner", style: "educational",
    isPremium: false, isFeatured: false,
  },
];

export const TEMPLATE_FILTERS = {
  categories: Array.from(new Set(DESIGN_TEMPLATES.map((t) => t.category))),
  formats: Array.from(new Set(DESIGN_TEMPLATES.map((t) => t.format))),
  styles: Array.from(new Set(DESIGN_TEMPLATES.map((t) => t.style).filter(Boolean))) as string[],
  difficulties: ["beginner", "intermediate", "advanced"] as const,
};

export const getTemplateById = (id: string): DesignTemplate | undefined =>
  DESIGN_TEMPLATES.find((t) => t.id === id);
