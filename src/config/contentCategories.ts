/**
 * UNIFIED CONTENT CATEGORY SYSTEM — the single source of truth.
 *
 * The homepage, dashboard Create hub, sidebar, templates, and workflows ALL import
 * from here. Do not define categories anywhere else. A category's `slug` is the
 * kebab-case of its name, so any homepage/footer label maps to
 * `/dashboard/create/<slugify(label)>` automatically.
 */

export type WorkflowType =
  | "video_generation" | "ad_generation" | "image_generation"
  | "seo_article_generation" | "social_post_generation"
  | "audio_generation" | "automation_series";

export type CategoryGroup = {
  id: string;
  name: string;
  slug: string;
  icon: string;        // lucide icon name (resolved in components)
  color: string;       // tailwind color stem for card tint
  workflow: WorkflowType;
  output: string;
  credits: number;
  order: number;
};

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { id: "video",      name: "AI Video Studio",         slug: "ai-video-studio",      icon: "Video",     color: "emerald", workflow: "video_generation",      output: "MP4 video",        credits: 80, order: 1 },
  { id: "ad",         name: "AI Ad Studio",            slug: "ai-ad-studio",         icon: "Megaphone", color: "amber",   workflow: "ad_generation",         output: "Ad creative/video", credits: 80, order: 2 },
  { id: "image",      name: "AI Image Studio",         slug: "ai-image-studio",      icon: "Image",     color: "violet",  workflow: "image_generation",      output: "Image",            credits: 5,  order: 3 },
  { id: "seo",        name: "AI SEO Studio",           slug: "ai-seo-studio",        icon: "Search",    color: "sky",     workflow: "seo_article_generation",output: "SEO article",      credits: 20, order: 4 },
  { id: "social",     name: "AI Social Studio",        slug: "ai-social-studio",     icon: "Share2",    color: "pink",    workflow: "social_post_generation",output: "Caption / post",   credits: 1,  order: 5 },
  { id: "audio",      name: "AI Audio & Music Studio", slug: "ai-audio-studio",      icon: "Music",     color: "orange",  workflow: "audio_generation",      output: "Audio / music",    credits: 5,  order: 6 },
  { id: "automation", name: "AI Automation Studio",    slug: "ai-automation-studio", icon: "Workflow",  color: "lime",    workflow: "automation_series",     output: "Automated series", credits: 0,  order: 7 },
];

type Raw = string | { name: string; featured?: boolean; workflow?: WorkflowType; route?: string };

// Default landing route per workflow (maps a category onto the real engine).
const WORKFLOW_ROUTE: Record<WorkflowType, string> = {
  video_generation: "/dashboard/projects/new",
  ad_generation: "/dashboard/projects/new?category=product-ads",
  image_generation: "/dashboard/thumbnails",
  seo_article_generation: "/dashboard/seo/new",
  social_post_generation: "/dashboard/generate?category=social-captions",
  audio_generation: "/dashboard/voice",
  automation_series: "/dashboard/automation",
};

// Per-group category lists (order = display order).
const GROUP_ITEMS: Record<string, Raw[]> = {
  video: [
    { name: "AI Shorts", featured: true }, "Faceless Videos", "YouTube Shorts", "TikTok Videos",
    "Instagram Reels", "Facebook Reels", { name: "Script to Video", featured: true }, "Image to Video",
    "Long-Form YouTube", "AI Story Videos", "Anime Stories", "Motivational Videos", "Horror Stories",
    "Educational Videos", "Explainer Videos", "Tutorial Videos", "Whiteboard Videos", "Slideshow Videos",
  ],
  ad: [
    { name: "Product Ads", featured: true }, "AI UGC Ads", "TikTok Ads", "Instagram Ads", "Facebook Ads",
    "YouTube Ads", "Marketplace Ads", "Dropshipping Ads", "Ecommerce Product Videos", "Brand Promo Videos",
    "Business Marketing Videos", "Real Estate Ads", "App Promo Videos",
  ],
  image: [
    { name: "Text to Image", featured: true }, "Product Photos", "AI Image Ads", "Social Media Graphics",
    "Blog Featured Images", "YouTube Thumbnails", "Instagram Posts", "Marketplace Images", "Brand Visuals",
    "Logo Concepts", "Banner Images",
  ],
  seo: [
    { name: "SEO Blog Post Generator", featured: true },
    { name: "WordPress Auto Poster", route: "/dashboard/seo/sites" },
    "AI SEO Article Writer",
    { name: "Keyword Content Planner", route: "/dashboard/tools/keyword-planner" },
    { name: "Meta Title Generator", route: "/dashboard/tools/meta-title-generator" },
    { name: "Meta Description Generator", route: "/dashboard/tools/meta-description-generator" },
    { name: "Blog Content Calendar", route: "/dashboard/seo/calendar" },
    { name: "Product Description Generator", route: "/dashboard/tools/product-description" },
    { name: "Landing Page Copy Generator", route: "/dashboard/tools/landing-copy" },
    { name: "FAQ Generator", route: "/dashboard/tools/faq-generator" }, "Schema Markup Assistant",
  ],
  social: [
    { name: "Social Media Captions", featured: true }, "Instagram Captions", "TikTok Captions",
    { name: "YouTube Descriptions", route: "/dashboard/tools/youtube-description" },
    "LinkedIn Posts", "Facebook Posts", "X/Twitter Posts",
    { name: "Hashtag Generator", route: "/dashboard/tools/hashtag-generator" },
    { name: "Content Calendar", route: "/dashboard/calendar" },
    { name: "Viral Hook Generator", route: "/dashboard/tools/viral-hook-generator" },
    { name: "Newsletter Summary", route: "/dashboard/tools/newsletter" },
  ],
  audio: [
    { name: "AI Voiceover", featured: true }, "Podcast Scripts", "Audio Ads",
    { name: "Music Videos", workflow: "video_generation", route: "/dashboard/projects/new" }, "Lyric Videos",
    "Meditation Audio", "Story Narration", "Voice Cloning Placeholder", "Sound Effect Prompts",
  ],
  automation: [
    { name: "Content Series", featured: true }, "Auto Publishing", "Scheduled Posts",
    { name: "Blog Scheduling", route: "/dashboard/seo/calendar" }, { name: "Social Scheduling", route: "/dashboard/calendar" },
    "YouTube Automation", "TikTok Automation", "Instagram Automation",
    { name: "WordPress Publishing", route: "/dashboard/seo/sites" }, "Campaign Planner",
  ],
};

export type ContentCategory = {
  categoryId: string;
  name: string;
  slug: string;
  group: string;        // group id
  groupName: string;
  groupSlug: string;
  shortDescription: string;
  icon: string;
  color: string;
  workflowType: WorkflowType;
  output: string;
  creditEstimate: number;
  isFeatured: boolean;
  dashboardOrder: number;
  homepageOrder: number;
  route: string;        // where "Create" goes (mapped to a real engine)
};

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function build(): ContentCategory[] {
  const out: ContentCategory[] = [];
  for (const group of CATEGORY_GROUPS) {
    const items = GROUP_ITEMS[group.id] ?? [];
    items.forEach((raw, i) => {
      const r = typeof raw === "string" ? { name: raw } : raw;
      const workflow = r.workflow ?? group.workflow;
      out.push({
        categoryId: `${group.id}.${slugify(r.name)}`,
        name: r.name,
        slug: slugify(r.name),
        group: group.id,
        groupName: group.name,
        groupSlug: group.slug,
        shortDescription: `${r.name} — ${group.name.replace("AI ", "")}`,
        icon: group.icon,
        color: group.color,
        workflowType: workflow,
        output: group.output,
        creditEstimate: group.credits,
        isFeatured: !!r.featured,
        dashboardOrder: i,
        homepageOrder: i,
        route: r.route ?? WORKFLOW_ROUTE[workflow],
      });
    });
  }
  return out;
}

export const CONTENT_CATEGORIES: ContentCategory[] = build();

export function categoriesByGroup(groupId: string): ContentCategory[] {
  return CONTENT_CATEGORIES.filter((c) => c.group === groupId);
}
export function getCategoryBySlug(slug: string): ContentCategory | undefined {
  return CONTENT_CATEGORIES.find((c) => c.slug === slug);
}
export function featuredCategories(): ContentCategory[] {
  return CONTENT_CATEGORIES.filter((c) => c.isFeatured);
}
