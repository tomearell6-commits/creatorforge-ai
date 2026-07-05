/**
 * Guided tour definitions. Each step highlights an element by its `target`
 * (`data-tour="..."`) attribute and/or points to a `href`. If the target isn't on
 * the current page, the overlay shows the card centered with a "Go there" action
 * that navigates to `href`. Tours never cost credits.
 */
export type TourStep = {
  target?: string;   // data-tour attribute to highlight
  href?: string;     // page this step lives on
  title: string;
  body: string;
};

export type Tour = { id: string; title: string; steps: TourStep[] };

export const TOURS: Tour[] = [
  {
    id: "create-first-video",
    title: "Create Your First Video",
    steps: [
      { target: "ai-video-studio", href: "/dashboard", title: "Open AI Video Studio", body: "Click here to open the AI Video Studio, where faceless and short-form videos are made." },
      { target: "create-first-video", href: "/dashboard/create?group=video", title: "Pick a video type", body: "Choose a category like AI Shorts or Faceless Videos to start a new project." },
      { href: "/dashboard/projects/new", title: "Generate your content", body: "Enter your idea — CreatorsForge generates the script, scenes, voiceover and images. Then render to MP4 in the Render Queue." },
    ],
  },
  {
    id: "create-first-design",
    title: "Create Your First Design",
    steps: [
      { target: "create-first-design", href: "/dashboard", title: "Open Design Studio", body: "Design Studio is where you make graphics, ads, thumbnails, covers and brand assets. Click to open it." },
      { href: "/dashboard/design/new", title: "Start a new design", body: "Pick a category and format, describe your goal and pick a style — AI drafts a professional concept you can edit." },
      { href: "/dashboard/design/new", title: "Edit & export", body: "Fine-tune text, colors and layers in the editor, then export PNG, JPG or PDF. Manual editing is always free." },
    ],
  },
  {
    id: "use-template-design",
    title: "Use a Design Template",
    steps: [
      { href: "/dashboard/design/templates", title: "Browse templates", body: "Open Design Templates and filter by difficulty or search by keyword." },
      { href: "/dashboard/design/templates", title: "Use a template", body: "Click \"Use template\" to open it in the editor with editable layers, then make it yours." },
    ],
  },
  {
    id: "apply-brand-kit",
    title: "Apply a Brand Kit",
    steps: [
      { href: "/dashboard/design/brand-kit", title: "Create a brand kit", body: "Save your logo, colors, fonts and tone once in Brand Kit." },
      { href: "/dashboard/design/new", title: "Apply it to a design", body: "In the design wizard (and the editor) pick your brand kit to instantly apply your colors and fonts." },
    ],
  },
  {
    id: "export-design",
    title: "Export a Design",
    steps: [
      { href: "/dashboard/design/projects", title: "Open a design", body: "Open any design from My Designs to launch the editor." },
      { href: "/dashboard/design/exports", title: "Export & track", body: "Use the Export menu for PNG, JPG or PDF. PNG/JPG are free; every export is listed under Exports." },
    ],
  },
  {
    id: "live-footage-design",
    title: "Create a Live AI Footage Prompt",
    steps: [
      { href: "/dashboard/design/video-graphics", title: "Open Live AI Footage", body: "Describe a scene, subject, camera and lighting to design a footage concept before generating video." },
      { href: "/dashboard/design/video-graphics", title: "Send to Video/Ad Studio", body: "Use the generated video prompt, shot list and storyboard in the Video or Ad Studio." },
    ],
  },
  {
    id: "plan-first-product",
    title: "Plan Your First Digital Product",
    steps: [
      { target: "plan-first-product", href: "/dashboard", title: "Open Build Studio", body: "Build Studio turns an idea into a complete plan: structure, copy, features, roadmap and marketing." },
      { href: "/dashboard/build/new", title: "Describe your idea", body: "Pick a project type (website, app, store, landing page or funnel), describe your idea, and choose a goal and style." },
      { href: "/dashboard/build/new", title: "Generate & export", body: "Generate the full package (~20 credits), review it across the tabs, then export a developer brief or a prompt package for AI coding tools." },
    ],
  },
  {
    id: "first-real-estate-design",
    title: "Create Your First Real Estate Design",
    steps: [
      { href: "/dashboard/design/industries", title: "Open Industry Suites", body: "Industry Suites are specialized design workspaces. Real Estate & Architecture is the first live suite." },
      { href: "/dashboard/design/industries/real-estate-architecture", title: "Start a project", body: "Click Create New Project, fill in the property details (type, bedrooms, style, budget) and pick an output type." },
      { href: "/dashboard/design/industries/real-estate-architecture", title: "Generate & export", body: "Generate your structured concept — summary, materials, palette, prompts and marketing copy — then export as PDF or a prompt package." },
    ],
  },
  {
    id: "use-real-estate-template",
    title: "Use a Real Estate Template",
    steps: [
      { href: "/dashboard/design/industries/real-estate-architecture", title: "Browse templates", body: "The Overview tab shows featured and full template libraries — Luxury Villa, Family House, Hotel, Investment Deck and more." },
      { href: "/dashboard/design/industries/real-estate-architecture", title: "Generate from a template", body: "Click any template — it preloads the wizard with a proven brief you can adjust before generating." },
    ],
  },
  {
    id: "property-marketing-assets",
    title: "Generate Property Marketing Assets",
    steps: [
      { href: "/dashboard/design/industries/real-estate-architecture", title: "Pick a marketing category", body: "Under Real Estate Marketing Designs choose flyers, ads, posters or brochures." },
      { href: "/dashboard/design/industries/real-estate-architecture", title: "Get copy + captions", body: "Set output type to Marketing Asset — you'll get marketing copy, a listing description and platform captions ready to use." },
    ],
  },
  {
    id: "ai-walkthrough-concept",
    title: "Create an AI Walkthrough Concept",
    steps: [
      { href: "/dashboard/design/industries/real-estate-architecture", title: "Open AI Walkthrough", body: "Switch to the AI Walkthrough tab in the Real Estate suite." },
      { href: "/dashboard/design/industries/real-estate-architecture", title: "Design the tour", body: "Describe the property, camera and lighting — get a scene list, drone shots, voiceover script and a ready video prompt, then send it to the Video Studio." },
    ],
  },
  {
    id: "export-real-estate-package",
    title: "Export a Real Estate Design Package",
    steps: [
      { href: "/dashboard/design/industries/real-estate-architecture", title: "Generate a concept", body: "Any generated concept shows export actions at the top of the result." },
      { href: "/dashboard/design/industries/real-estate-architecture", title: "Export", body: "Export PDF for presentations, download the prompt package (JSON), or copy the image prompts straight into any image model." },
    ],
  },
  {
    id: "business-ops-setup",
    title: "Set Up Your AI Business Manager",
    steps: [
      { href: "/dashboard/business", title: "Meet your Business Manager", body: "The Executive Dashboard shows your Business Health Score, inquiries, drafts and approvals — every number comes from your real activity." },
      { href: "/dashboard/business/profile", title: "Teach the AI your business", body: "Fill in your Company Profile — description, target market, brand voice. This is the AI's brain: every reply, document and campaign is written from it." },
      { href: "/dashboard/business/knowledge", title: "Add your knowledge", body: "Paste FAQs, policies and pricing into the Knowledge Base. The AI quotes YOUR facts instead of inventing answers." },
      { href: "/dashboard/business/products", title: "Load your catalogue", body: "Add products, then generate a marketing pack per product — SEO description, captions, FAQ, and prompts for images and videos." },
      { href: "/dashboard/business/health", title: "Watch your score climb", body: "The Health Score explains every point and tells you the next best improvement." },
    ],
  },
  {
    id: "business-inquiries",
    title: "Handle Inquiries with AI",
    steps: [
      { href: "/dashboard/business/settings", title: "Connect your website form", body: "Copy the form snippet — submissions from your site (or forwarded marketplace inquiries) land in the Inquiry Center automatically." },
      { href: "/dashboard/business/inquiries", title: "AI triage", body: "One click classifies every new inquiry: sales, support, quotation, partnership — with priority and sensitive-topic flags." },
      { href: "/dashboard/business/inquiries", title: "Draft, approve, send", body: "AI drafts a professional reply from your profile and knowledge. You approve or edit, then copy it into your own email — nothing is ever sent without you." },
    ],
  },
  {
    id: "business-documents",
    title: "Generate Business Documents",
    steps: [
      { href: "/dashboard/business/documents", title: "Pick a document type", body: "Quotations, invoices, proposals, purchase orders and more — numbered automatically." },
      { href: "/dashboard/business/documents", title: "Brief the AI, review, print", body: "Give it the facts and line items — it drafts the document from your company profile. Review, then Print / Save as PDF." },
    ],
  },
  {
    id: "ai-shorts",
    title: "Generate AI Shorts",
    steps: [
      { target: "ai-video-studio", href: "/dashboard", title: "Open AI Video Studio", body: "AI Shorts live in the AI Video Studio. Click here to open it." },
      { target: "ai-shorts", href: "/dashboard/create?group=video", title: "Choose AI Shorts", body: "Select AI Shorts to create a vertical short-form video optimized for Reels/Shorts/TikTok." },
    ],
  },
  {
    id: "product-ad",
    title: "Create a Product Ad",
    steps: [
      { target: "ai-ad-studio", href: "/dashboard", title: "Open AI Ad Studio", body: "Product ads are made in the AI Ad Studio. Click here to open it." },
      { href: "/dashboard/create?group=ad", title: "Choose Product Ads", body: "Pick Product Ads, add your product details, and generate the ad creative." },
    ],
  },
  {
    id: "seo-blog-post",
    title: "Generate an SEO Blog Post",
    steps: [
      { target: "seo-studio", href: "/dashboard", title: "Open AI SEO Studio", body: "Click here to open the SEO Studio." },
      { href: "/dashboard/seo/new", title: "Generate the article", body: "Enter your topic and click Generate. Review and edit the draft, then publish it to a connected WordPress site." },
    ],
  },
  {
    id: "connect-wordpress",
    title: "Connect WordPress",
    steps: [
      { target: "wordpress-connect", href: "/dashboard", title: "Open WordPress Sites", body: "Click here to manage the WordPress sites you publish to." },
      { href: "/dashboard/seo/sites", title: "Add your site", body: "Enter your site URL, username, and an Application Password (created in WordPress under Users → Profile)." },
    ],
  },
  {
    id: "connect-social",
    title: "Connect a Social Account",
    steps: [
      { target: "social-accounts", href: "/dashboard", title: "Open Social Accounts", body: "Click here to connect your publishing platforms." },
      { href: "/dashboard/social", title: "Authorize a platform", body: "Connect YouTube, TikTok, Instagram, Facebook, LinkedIn, X or Pinterest." },
    ],
  },
  {
    id: "render-export",
    title: "Render & Export Video",
    steps: [
      { target: "render-queue", href: "/dashboard", title: "Open the Render Queue", body: "Click here to render projects into a downloadable MP4." },
      { href: "/dashboard/render", title: "Choose a render tier", body: "Pick a tier (Slideshow or an AI video tier). When it finishes, play or download your MP4." },
    ],
  },
  {
    id: "top-up-credits",
    title: "Top Up Credits",
    steps: [
      { target: "credit-topup", href: "/dashboard", title: "Open the Credit Wallet", body: "Click here to open your Credit Wallet." },
      { href: "/dashboard/credits", title: "Buy credits", body: "Choose a package or a custom amount, pick a cryptocurrency, and complete checkout. Purchased credits never expire." },
    ],
  },
  {
    id: "schedule-content",
    title: "Schedule Content",
    steps: [
      { target: "publishing-calendar", href: "/dashboard", title: "Open the Publishing Calendar", body: "Click here to plan and schedule your posts." },
      { href: "/dashboard/calendar", title: "Schedule a post", body: "Pick a date and time to publish — drag to reschedule any time." },
    ],
  },
  {
    id: "use-templates",
    title: "Use Templates",
    steps: [
      { target: "templates", href: "/dashboard", title: "Open Templates", body: "Click here to browse ready-made templates." },
      { href: "/dashboard/templates", title: "Start from a template", body: "Filter by group or platform and click a template to start a project from a preset." },
    ],
  },
];

export function getTour(id: string): Tour | undefined {
  return TOURS.find((t) => t.id === id);
}
