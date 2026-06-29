/**
 * Marketing site content (CreatorForge.io redesign). All original copy — drives
 * the homepage sections + footer. Kept data-only so components stay reusable.
 */

/** Hero model selector options. */
export const HERO_MODELS = [
  "CreatorForge Video Pro",
  "Image to Video",
  "AI Shorts",
  "AI Ads",
  "Music Video",
  "Script to Video",
] as const;

/** Horizontal tool/model pills under the hero. */
export const TOOL_PILLS = [
  "AI Shorts", "SEO Blog Posts", "WordPress Publishing", "Image to Video", "Text to Image",
  "Script to Video", "AI UGC", "Product Ads", "Music Video", "Talking Avatar",
  "Caption Generator", "YouTube Shorts", "TikTok Ads", "Instagram Reels",
];

/** Three featured tool cards. */
export const FEATURE_CARDS = [
  {
    title: "AI Shorts Studio",
    desc: "Generate short-form faceless videos for TikTok, YouTube Shorts, and Instagram Reels.",
    tint: "from-brand-200 to-brand-50",
    emoji: "🎬",
    href: "/dashboard/create/ai-shorts",
  },
  {
    title: "Product Ad Generator",
    desc: "Create scroll-stopping product ads for ecommerce, dropshipping, and social campaigns.",
    tint: "from-emerald-200 to-emerald-50",
    emoji: "🛍️",
    href: "/dashboard/create/product-ads",
  },
  {
    title: "Image to Video Studio",
    desc: "Turn product images, photos, and brand visuals into engaging videos.",
    tint: "from-lime-200 to-lime-50",
    emoji: "✨",
    href: "/dashboard/create/image-to-video",
  },
  {
    title: "SEO Content Studio",
    desc: "Generate full SEO blog packages and auto-publish them to WordPress on a schedule.",
    tint: "from-green-200 to-green-50",
    emoji: "🔍",
    href: "/tools/seo-content-studio",
  },
];

/** Workflow tabs + their feature panels. */
export const WORKFLOW_TABS = [
  {
    id: "earn",
    label: "Earn with AI",
    title: "AI Shorts on Autopilot",
    bullets: ["Generate videos from prompts", "Create daily content ideas", "Edit scripts and scenes", "Export in minutes"],
  },
  {
    id: "ads",
    label: "Boost Marketing Ads",
    title: "AI Image Ads",
    bullets: ["Create product ad creatives", "Use templates for multiple niches", "Generate marketplace visuals", "Test different ad angles"],
  },
  {
    id: "pro",
    label: "Create Pro Content",
    title: "Image to Video Ads",
    bullets: ["Convert product images into videos", "Generate UGC-style ads", "Auto-write scripts", "Add captions and voiceovers"],
  },
  {
    id: "music",
    label: "Music Videos",
    title: "Music Video Studio",
    bullets: ["Upload your track", "Generate beat-synced visuals", "Create lyric-style clips", "Export ready-to-post videos"],
  },
];

/** Template gallery — categories + cards. */
export const TEMPLATE_SECTIONS = [
  { id: "autoshorts", label: "AI Autoshorts", items: ["Horror Story", "Motivational Video", "Anime Style", "3D Cartoon"] },
  { id: "ads", label: "Paid Ads", items: ["Product Demo", "UGC Ad", "Marketplace Ad", "Business Promo"] },
  { id: "viral", label: "Viral Videos", items: ["Crypto Explainer", "Reddit Story", "Top 5 List", "Did You Know"] },
  { id: "music", label: "Music Videos", items: ["Music Visualizer", "Lyric Video", "Beat Loop", "Concert Cut"] },
  { id: "seo", label: "SEO Blog Posts", items: ["How-To Guide", "Listicle", "Product Review", "Comparison Post", "Ultimate Guide", "Buying Guide"] },
];

/** Marketing pricing tiers (display only — billing logic uses lib/constants PLANS). */
export const MARKETING_PLANS = [
  { id: "basic", name: "Basic", monthly: 19, credits: 1900, tagline: "Good for beginners", highlight: false,
    features: ["~40 AI shorts / mo", "Image-to-video access", "Caption generator", "Standard models"] },
  { id: "pro", name: "Pro", monthly: 39, credits: 3900, tagline: "Good for regular creators", highlight: false,
    features: ["~85 AI shorts / mo", "Product ad tools", "All standard models", "Priority rendering"] },
  { id: "ultimate", name: "Ultimate", monthly: 69, credits: 8280, tagline: "Most popular", highlight: true,
    features: ["~180 AI shorts / mo", "Premium AI models", "Image-to-video Pro", "Faster rendering"] },
  { id: "creator", name: "Creator", monthly: 89, credits: 13350, tagline: "Best for scaling production", highlight: false,
    features: ["~290 AI shorts / mo", "All premium models", "Bulk + series automation", "Top-priority rendering"] },
];

/** FAQ tabs + cards. */
export const FAQ_TABS = [
  {
    id: "series", label: "Series",
    items: [
      { q: "What is a Series?", a: "A Series is a collection of related videos around one topic. CreatorForge can help generate and schedule videos automatically." },
      { q: "How do I set up a Series?", a: "Choose a topic, select a style, set posting frequency, and CreatorForge prepares the content workflow." },
      { q: "Which platforms can I publish to?", a: "YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, and more." },
    ],
  },
  {
    id: "ads", label: "Paid Ads",
    items: [
      { q: "Can I create product ads?", a: "Yes — generate scroll-stopping image and video ads from a prompt or a product photo." },
      { q: "Are there templates?", a: "Yes, 100+ ad templates across niches you can recreate in one click." },
    ],
  },
  {
    id: "t2i", label: "Text to Image",
    items: [
      { q: "Which image models are available?", a: "High-quality models for photorealistic and stylized images, selectable per project." },
    ],
  },
  {
    id: "i2v", label: "Image to Video",
    items: [
      { q: "How does image-to-video work?", a: "Upload an image or use a generated one, and CreatorForge animates it into a short clip." },
    ],
  },
  {
    id: "music", label: "Music Video",
    items: [
      { q: "Can I use my own track?", a: "Yes — upload audio and generate beat-synced or lyric-style visuals." },
    ],
  },
  {
    id: "billing", label: "Billing",
    items: [
      { q: "How do credits work?", a: "Credits are used for AI generation, rendering, voiceovers, and premium model usage." },
      { q: "Can I cancel anytime?", a: "Yes — plans are flexible and you can upgrade, downgrade, or cancel whenever you like." },
    ],
  },
];

/** Footer link columns. */
export const FOOTER_COLUMNS = [
  {
    heading: "Popular Tools",
    links: [
      "SEO Blog Post Generator", "Image to Video AI", "AI UGC Video Generator", "Script to Video AI",
      "AI YouTube Shorts Generator", "AI TikTok Video Generator", "AI Image Generator",
      "TikTok Ad Maker", "Instagram Video Ad Maker", "AI Shorts Series Maker",
      "YouTube Caption Generator", "TikTok Caption Generator", "Instagram Caption Generator",
      "Facebook Caption Generator", "LinkedIn Caption Generator",
    ],
  },
  {
    heading: "SEO Tools",
    links: [
      "SEO Blog Post Generator", "WordPress Auto Poster", "AI SEO Article Writer",
      "Blog Content Calendar", "Meta Description Generator", "SEO Title Generator",
      "Keyword Content Planner",
    ],
  },
  {
    heading: "Video Maker by Use Case",
    links: [
      "Promo Video Maker", "Product Video Maker", "Business Video Maker",
      "Marketing Video Maker", "Explainer Video Maker", "Game Video Maker",
      "Animated Video Maker", "Lyric Video Maker", "Collage Video Maker",
      "Slideshow Video Maker", "Facebook Ad Video Maker", "Intro Video Maker",
      "Cartoon Video Maker", "Food Video Maker",
    ],
  },
  {
    heading: "Special Occasion Makers",
    links: [
      "Anniversary Video Maker", "Birthday Video Maker", "Video Meme Maker",
      "Memorial Video Maker", "Wedding Invitation Maker", "Funny Video Maker",
      "Animation Generator", "Motivational Video Generator", "Photo to Cartoon AI",
      "Photo to Anime AI", "Video with Words Generator",
    ],
  },
  {
    heading: "Education & Training",
    links: [
      "Training Video Maker", "Tutorial Video Maker", "Presentation Maker",
      "Whiteboard Video Maker", "Course Video Maker", "Onboarding Video Maker",
      "How-To Video Maker", "Demo Video Maker", "Highlight Video Maker",
    ],
  },
  {
    heading: "Resources",
    links: [
      "Blog", "Affiliate Program", "Pricing", "Community", "Help Center",
      "Templates", "Roadmap", "Status", "Contact", "Terms", "Privacy",
    ],
  },
];
