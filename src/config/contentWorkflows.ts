/**
 * Unified workflow definitions. Each content category maps to one WorkflowType
 * (see contentCategories.ts). The Create hub shows these steps and the "Start"
 * button routes to the matching real engine.
 */
import type { WorkflowType } from "./contentCategories";

export const WORKFLOWS: Record<WorkflowType, { label: string; steps: string[] }> = {
  video_generation: {
    label: "Video generation",
    steps: ["Content idea", "Script generation", "Scene breakdown", "Voiceover", "Visual generation", "Captions", "Timeline", "Render", "Export or publish"],
  },
  ad_generation: {
    label: "Ad generation",
    steps: ["Product / offer details", "Audience", "Platform", "Hook generation", "Script", "Visual direction", "CTA", "Ad creative", "Export or publish"],
  },
  image_generation: {
    label: "Image generation",
    steps: ["Image goal", "Style", "Product / subject", "Prompt generation", "Image generation", "Edit", "Download"],
  },
  seo_article_generation: {
    label: "SEO article generation",
    steps: ["Main keyword", "Target country", "Search intent", "Outline", "Full article", "Metadata", "Featured image prompt", "WordPress schedule or publish"],
  },
  social_post_generation: {
    label: "Social post generation",
    steps: ["Topic", "Platform", "Tone", "Caption", "Hashtags", "CTA", "Schedule or publish"],
  },
  audio_generation: {
    label: "Audio generation",
    steps: ["Topic or script", "Voice style", "Voiceover", "Background sound", "Export audio"],
  },
  automation_series: {
    label: "Automation series",
    steps: ["Series topic", "Content type", "Posting frequency", "Platforms", "Auto-generate queue", "Schedule", "Publish"],
  },
};
