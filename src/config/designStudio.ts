/**
 * CreatorForge Design Studio — the single source of truth for the design
 * workspace taxonomy: category groups, categories, canvas formats, and visual
 * styles. Consumed by the wizard, category grid, editor, templates, and the
 * AI concept generator. A category's `slug` is the kebab-case of its name.
 */

export type DesignGroup = {
  id: string;
  name: string;
  slug: string;
  icon: string;        // lucide icon name (resolved in components)
  color: string;       // tailwind color stem for card tint
  description: string;
  order: number;
};

export type DesignCategory = {
  name: string;
  slug: string;
  group: string;       // DesignGroup.id
  format: string;      // default DesignFormat.id
  credits: number;     // AI concept generation estimate
  featured?: boolean;
};

export type DesignFormat = {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
};

export type DesignStyle = {
  id: string;
  label: string;
  description: string;
};

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ---- Canvas formats (Step 2 of the wizard) --------------------------------
export const DESIGN_FORMATS: DesignFormat[] = [
  { id: "square-1-1",    label: "Square",        ratio: "1:1",  width: 1080, height: 1080 },
  { id: "portrait-4-5",  label: "Portrait",      ratio: "4:5",  width: 1080, height: 1350 },
  { id: "story-9-16",    label: "Story / Reel",  ratio: "9:16", width: 1080, height: 1920 },
  { id: "landscape-16-9",label: "Landscape",     ratio: "16:9", width: 1920, height: 1080 },
  { id: "wide-2-1",      label: "Wide Banner",   ratio: "2:1",  width: 1500, height: 750 },
  { id: "pin-2-3",       label: "Pin",           ratio: "2:3",  width: 1000, height: 1500 },
  { id: "a4",            label: "A4",            ratio: "A4",   width: 2480, height: 3508 },
  { id: "letter",        label: "US Letter",     ratio: "Letter", width: 2550, height: 3300 },
  { id: "custom",        label: "Custom Size",   ratio: "Custom", width: 1080, height: 1080 },
];

export const getDesignFormat = (id: string): DesignFormat =>
  DESIGN_FORMATS.find((f) => f.id === id) ?? DESIGN_FORMATS[0];

// ---- Visual styles (Step 4 of the wizard) ---------------------------------
export const DESIGN_STYLES: DesignStyle[] = [
  { id: "minimal",     label: "Minimal",     description: "Clean, spacious, restrained palette." },
  { id: "luxury",      label: "Luxury",      description: "Premium, elegant, high-contrast." },
  { id: "bold",        label: "Bold",        description: "Loud type, saturated color, high energy." },
  { id: "corporate",   label: "Corporate",   description: "Trustworthy, structured, professional." },
  { id: "playful",     label: "Playful",     description: "Fun, rounded, colorful and friendly." },
  { id: "futuristic",  label: "Futuristic",  description: "Sleek, neon, forward-looking." },
  { id: "tech",        label: "Tech",        description: "Modern SaaS, gradients, geometric." },
  { id: "fashion",     label: "Fashion",     description: "Editorial, stylish, trend-led." },
  { id: "natural",     label: "Natural",     description: "Organic, earthy, calm tones." },
  { id: "educational", label: "Educational", description: "Clear, informative, approachable." },
  { id: "ecommerce",   label: "Ecommerce",   description: "Conversion-focused, product-forward." },
  { id: "cinematic",   label: "Cinematic",   description: "Dramatic lighting, filmic depth." },
];

// ---- Category groups -------------------------------------------------------
export const DESIGN_GROUPS: DesignGroup[] = [
  { id: "social",     name: "Social Media Design", slug: "social-media-design", icon: "Share2",     color: "pink",    description: "Posts, stories, covers and reels graphics for every platform.", order: 1 },
  { id: "advertising",name: "Advertising Design",  slug: "advertising-design",  icon: "Megaphone",  color: "amber",   description: "High-converting ad creatives for paid campaigns.", order: 2 },
  { id: "business",   name: "Business Design",     slug: "business-design",     icon: "Briefcase",  color: "sky",     description: "Cards, decks, proposals and corporate materials.", order: 3 },
  { id: "website",    name: "Website & SEO Design",slug: "website-seo-design",  icon: "Globe",      color: "cyan",    description: "Hero images, blog visuals and infographics.", order: 4 },
  { id: "publishing", name: "Publishing Design",   slug: "publishing-design",   icon: "BookOpen",   color: "violet",  description: "Book, ebook and course covers and illustrations.", order: 5 },
  { id: "ecommerce",  name: "Ecommerce Design",    slug: "ecommerce-design",    icon: "ShoppingBag",color: "emerald", description: "Product visuals, banners and promo graphics.", order: 6 },
  { id: "video",      name: "Video & Motion Design",slug: "video-motion-design",icon: "Clapperboard",color: "rose",   description: "Thumbnails, intro/outro cards, lower thirds and storyboards.", order: 7 },
  { id: "brand",      name: "Brand Design",        slug: "brand-design",        icon: "Palette",    color: "lime",    description: "Logos, palettes, moodboards and full brand kits.", order: 8 },
];

export const getDesignGroup = (id: string): DesignGroup | undefined =>
  DESIGN_GROUPS.find((g) => g.id === id);

// Per-group category names (order = display order). Format + credits derived below.
type Raw = string | { name: string; format?: string; credits?: number; featured?: boolean };

const GROUP_ITEMS: Record<string, Raw[]> = {
  social: [
    { name: "Instagram Post", format: "square-1-1", featured: true },
    { name: "Instagram Story", format: "story-9-16" },
    { name: "Instagram Reel Cover", format: "story-9-16" },
    { name: "Facebook Post", format: "square-1-1" },
    { name: "Facebook Cover", format: "wide-2-1" },
    { name: "TikTok Cover", format: "story-9-16" },
    { name: "YouTube Thumbnail", format: "landscape-16-9", featured: true },
    { name: "YouTube Banner", format: "wide-2-1" },
    { name: "LinkedIn Post", format: "square-1-1" },
    { name: "X/Twitter Post", format: "landscape-16-9" },
    { name: "Pinterest Pin", format: "pin-2-3" },
  ],
  advertising: [
    { name: "Facebook Ad", format: "square-1-1", featured: true },
    { name: "Instagram Ad", format: "portrait-4-5" },
    { name: "TikTok Ad", format: "story-9-16" },
    { name: "YouTube Ad", format: "landscape-16-9" },
    { name: "Google Display Ad", format: "wide-2-1" },
    { name: "Product Ad", format: "square-1-1", featured: true },
    { name: "Ecommerce Ad", format: "square-1-1" },
    { name: "UGC Ad Graphic", format: "story-9-16" },
    { name: "Marketplace Ad", format: "square-1-1" },
    { name: "Banner Ad", format: "wide-2-1" },
  ],
  business: [
    { name: "Business Card", format: "landscape-16-9" },
    { name: "Letterhead", format: "a4" },
    { name: "Proposal Cover", format: "a4" },
    { name: "Invoice Template", format: "a4" },
    { name: "Presentation", format: "landscape-16-9", featured: true },
    { name: "Pitch Deck", format: "landscape-16-9" },
    { name: "Company Profile", format: "a4" },
    { name: "Brochure", format: "a4" },
    { name: "Flyer", format: "portrait-4-5" },
  ],
  website: [
    { name: "Blog Featured Image", format: "landscape-16-9", featured: true },
    { name: "Website Hero Image", format: "landscape-16-9" },
    { name: "Landing Page Graphic", format: "landscape-16-9" },
    { name: "SEO Article Image", format: "landscape-16-9" },
    { name: "Infographic", format: "pin-2-3" },
    { name: "Product Page Image", format: "square-1-1" },
    { name: "Testimonial Graphic", format: "square-1-1" },
  ],
  publishing: [
    { name: "Book Cover", format: "pin-2-3", featured: true },
    { name: "Ebook Cover", format: "pin-2-3" },
    { name: "Workbook Cover", format: "a4" },
    { name: "Journal Cover", format: "pin-2-3" },
    { name: "Course Cover", format: "landscape-16-9" },
    { name: "Chapter Illustration", format: "square-1-1" },
    { name: "Children's Book Illustration", format: "landscape-16-9" },
  ],
  ecommerce: [
    { name: "Product Photo Enhancement", format: "square-1-1", credits: 8 },
    { name: "Product Background", format: "square-1-1", credits: 8 },
    { name: "Product Promo Banner", format: "wide-2-1" },
    { name: "Store Banner", format: "wide-2-1" },
    { name: "Product Comparison Graphic", format: "portrait-4-5" },
    { name: "Sale Announcement", format: "square-1-1", featured: true },
    { name: "New Arrival Graphic", format: "square-1-1" },
  ],
  video: [
    { name: "Video Thumbnail", format: "landscape-16-9", featured: true },
    { name: "Video Intro Card", format: "landscape-16-9" },
    { name: "Video Outro Card", format: "landscape-16-9" },
    { name: "Animated Text Card", format: "landscape-16-9" },
    { name: "Lower Third", format: "landscape-16-9" },
    { name: "Storyboard Frame", format: "landscape-16-9" },
    { name: "Live AI Footage Concept", format: "landscape-16-9", featured: true, credits: 10 },
    { name: "Motion Ad Template", format: "story-9-16" },
    { name: "Music Video Visual Frame", format: "landscape-16-9" },
  ],
  brand: [
    { name: "Logo Concept", format: "square-1-1", featured: true },
    { name: "Brand Color Palette", format: "landscape-16-9" },
    { name: "Typography Pairing", format: "landscape-16-9" },
    { name: "Brand Moodboard", format: "landscape-16-9" },
    { name: "Brand Kit", format: "landscape-16-9", featured: true },
    { name: "Social Brand Pack", format: "square-1-1" },
    { name: "Marketing Kit", format: "landscape-16-9" },
  ],
};

const DEFAULT_CONCEPT_CREDITS = 6;

export const DESIGN_CATEGORIES: DesignCategory[] = DESIGN_GROUPS.flatMap((g) =>
  (GROUP_ITEMS[g.id] ?? []).map((raw) => {
    const item = typeof raw === "string" ? { name: raw } : raw;
    return {
      name: item.name,
      slug: slugify(item.name),
      group: g.id,
      format: item.format ?? "square-1-1",
      credits: item.credits ?? DEFAULT_CONCEPT_CREDITS,
      featured: item.featured ?? false,
    };
  })
);

export const getDesignCategoryBySlug = (slug: string): DesignCategory | undefined =>
  DESIGN_CATEGORIES.find((c) => c.slug === slug);

export const getCategoriesForGroup = (groupId: string): DesignCategory[] =>
  DESIGN_CATEGORIES.filter((c) => c.group === groupId);

export const FEATURED_DESIGN_CATEGORIES: DesignCategory[] =
  DESIGN_CATEGORIES.filter((c) => c.featured);
