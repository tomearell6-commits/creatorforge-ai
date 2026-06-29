/**
 * UNIFIED TEMPLATE SYSTEM — single source of truth for templates.
 * Each template references a category `slug` from contentCategories.ts; its group,
 * workflow type, and route are derived from that category so everything stays in
 * sync. The dashboard template gallery + homepage template sections read from here.
 */
import { getCategoryBySlug, type WorkflowType } from "./contentCategories";

export type OutputFormat = "Video" | "Image" | "Article" | "Caption" | "Audio" | "Series";

type TemplateDef = {
  id: string;
  name: string;
  categorySlug: string;
  description: string;
  emoji: string;
  platforms: string[];
  output: OutputFormat;
  featured?: boolean;
  isNew?: boolean;
};

export type ContentTemplate = TemplateDef & {
  group: string;
  groupName: string;
  workflowType: WorkflowType;
  estimatedCredits: number;
  route: string;        // /dashboard/create/<categorySlug>
  templateOrder: number;
};

const DEFS: TemplateDef[] = [
  // Video
  { id: "horror-short", name: "Horror Story Short", categorySlug: "horror-stories", description: "Spine-chilling narrated short for TikTok/Shorts.", emoji: "👻", platforms: ["YouTube", "TikTok"], output: "Video", featured: true },
  { id: "motivational-reel", name: "Motivational Reel", categorySlug: "motivational-videos", description: "High-energy motivational reel with captions.", emoji: "🔥", platforms: ["Instagram", "TikTok"], output: "Video", featured: true },
  { id: "anime-recap", name: "Anime Recap", categorySlug: "anime-stories", description: "Anime-styled recap or original tale.", emoji: "🌸", platforms: ["YouTube"], output: "Video" },
  { id: "faceless-explainer", name: "Faceless Explainer", categorySlug: "explainer-videos", description: "Faceless explainer from a single prompt.", emoji: "🎬", platforms: ["YouTube"], output: "Video" },
  { id: "img2vid-promo", name: "Image-to-Video Promo", categorySlug: "image-to-video", description: "Turn a product image into a moving promo.", emoji: "✨", platforms: ["Instagram"], output: "Video", isNew: true },
  { id: "slideshow-story", name: "Slideshow Story", categorySlug: "slideshow-videos", description: "Narrated image slideshow with captions.", emoji: "🖼️", platforms: ["YouTube"], output: "Video" },

  // Ads
  { id: "ugc-ad", name: "UGC Product Ad", categorySlug: "ai-ugc-ads", description: "Authentic UGC-style ad for socials.", emoji: "📦", platforms: ["TikTok", "Instagram"], output: "Video", featured: true },
  { id: "product-demo", name: "Product Demo Ad", categorySlug: "product-ads", description: "Scroll-stopping product demo ad.", emoji: "🛍️", platforms: ["Facebook"], output: "Video" },
  { id: "marketplace-ad", name: "Marketplace Ad", categorySlug: "marketplace-ads", description: "Listing creative for marketplaces.", emoji: "🏷️", platforms: ["Any"], output: "Image" },
  { id: "dropship-ad", name: "Dropshipping Ad", categorySlug: "dropshipping-ads", description: "Fast-testing dropshipping video ad.", emoji: "🚚", platforms: ["TikTok"], output: "Video" },
  { id: "brand-promo", name: "Brand Promo Video", categorySlug: "brand-promo-videos", description: "Polished brand promo clip.", emoji: "💼", platforms: ["YouTube"], output: "Video" },

  // Images
  { id: "product-photo", name: "Product Photo", categorySlug: "product-photos", description: "Studio-quality product shot.", emoji: "📸", platforms: ["Any"], output: "Image", featured: true },
  { id: "yt-thumb", name: "YouTube Thumbnail", categorySlug: "youtube-thumbnails", description: "High-CTR 16:9 thumbnail.", emoji: "🖱️", platforms: ["YouTube"], output: "Image" },
  { id: "ig-post", name: "Instagram Post Graphic", categorySlug: "instagram-posts", description: "On-brand square post graphic.", emoji: "🟪", platforms: ["Instagram"], output: "Image" },
  { id: "blog-featured", name: "Blog Featured Image", categorySlug: "blog-featured-images", description: "Hero image for an article.", emoji: "🖼️", platforms: ["Blog", "WordPress"], output: "Image" },
  { id: "banner", name: "Banner Image", categorySlug: "banner-images", description: "Web/social banner.", emoji: "🏞️", platforms: ["Any"], output: "Image" },

  // SEO
  { id: "howto-guide", name: "How-To Guide", categorySlug: "seo-blog-post-generator", description: "Full SEO how-to article + meta.", emoji: "📝", platforms: ["WordPress", "Blog"], output: "Article", featured: true },
  { id: "listicle", name: "Listicle", categorySlug: "seo-blog-post-generator", description: "“Top N” SEO listicle.", emoji: "🔢", platforms: ["WordPress"], output: "Article" },
  { id: "product-review", name: "Product Review", categorySlug: "ai-seo-article-writer", description: "In-depth SEO product review.", emoji: "⭐", platforms: ["WordPress"], output: "Article" },
  { id: "comparison", name: "Comparison Post", categorySlug: "ai-seo-article-writer", description: "X vs Y comparison article.", emoji: "⚖️", platforms: ["WordPress"], output: "Article" },
  { id: "buying-guide", name: "Buying Guide", categorySlug: "seo-blog-post-generator", description: "Commercial-intent buying guide.", emoji: "🛒", platforms: ["WordPress"], output: "Article", isNew: true },
  { id: "product-desc", name: "Product Description", categorySlug: "product-description-generator", description: "SEO product descriptions at scale.", emoji: "🏷️", platforms: ["Any"], output: "Article" },

  // Social
  { id: "viral-hook", name: "Viral Hook Pack", categorySlug: "viral-hook-generator", description: "Scroll-stopping opening hooks.", emoji: "🪝", platforms: ["TikTok", "Instagram"], output: "Caption", featured: true },
  { id: "ig-captions", name: "Instagram Caption Pack", categorySlug: "instagram-captions", description: "Caption variations + hashtags.", emoji: "📷", platforms: ["Instagram"], output: "Caption" },
  { id: "linkedin-post", name: "LinkedIn Post", categorySlug: "linkedin-posts", description: "Thought-leadership LinkedIn post.", emoji: "💼", platforms: ["LinkedIn"], output: "Caption" },
  { id: "x-thread", name: "X Thread", categorySlug: "x-twitter-posts", description: "Engaging multi-tweet thread.", emoji: "✖️", platforms: ["X"], output: "Caption" },
  { id: "hashtags", name: "Hashtag Set", categorySlug: "hashtag-generator", description: "Optimized hashtag sets.", emoji: "#️⃣", platforms: ["Any"], output: "Caption" },

  // Audio
  { id: "podcast-intro", name: "Podcast Intro", categorySlug: "podcast-scripts", description: "Podcast script + voiceover.", emoji: "🎙️", platforms: ["Any"], output: "Audio" },
  { id: "story-narration", name: "Story Narration", categorySlug: "story-narration", description: "Narrated story audio.", emoji: "🗣️", platforms: ["YouTube"], output: "Audio", featured: true },
  { id: "music-visualizer", name: "Music Visualizer", categorySlug: "music-videos", description: "Beat-synced visual for a track.", emoji: "🎵", platforms: ["YouTube"], output: "Video" },
  { id: "meditation", name: "Meditation Track", categorySlug: "meditation-audio", description: "Calm guided meditation audio.", emoji: "🧘", platforms: ["Any"], output: "Audio" },

  // Automation
  { id: "daily-shorts", name: "Daily Shorts Series", categorySlug: "content-series", description: "Auto-generated daily shorts queue.", emoji: "♻️", platforms: ["TikTok", "YouTube"], output: "Series", featured: true },
  { id: "blog-autoseries", name: "Blog Auto-Series", categorySlug: "blog-scheduling", description: "Scheduled SEO blog series → WordPress.", emoji: "📅", platforms: ["WordPress"], output: "Series", isNew: true },
  { id: "social-drip", name: "Social Drip Campaign", categorySlug: "social-scheduling", description: "Scheduled multi-platform social drip.", emoji: "💧", platforms: ["Instagram"], output: "Series" },
];

function build(): ContentTemplate[] {
  return DEFS.map((d, i) => {
    const cat = getCategoryBySlug(d.categorySlug);
    return {
      ...d,
      group: cat?.group ?? "video",
      groupName: cat?.groupName ?? "AI Video Studio",
      workflowType: cat?.workflowType ?? "video_generation",
      estimatedCredits: cat?.creditEstimate ?? 0,
      route: `/dashboard/create/${d.categorySlug}`,
      templateOrder: i,
    };
  });
}

export const CONTENT_TEMPLATES: ContentTemplate[] = build();
export const TEMPLATE_PLATFORMS = Array.from(new Set(CONTENT_TEMPLATES.flatMap((t) => t.platforms))).sort();
export const TEMPLATE_OUTPUTS: OutputFormat[] = ["Video", "Image", "Article", "Caption", "Audio", "Series"];
