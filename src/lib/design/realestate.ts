/**
 * Real Estate & Architecture Suite — AI generators.
 *
 * generateRealEstateConcept: wizard inputs → structured RealEstateConcept
 * (summary, style direction, materials, palette, prompts, marketing copy,
 * storyboard, walkthrough script). generateWalkthroughConcept: property
 * details → AI walkthrough plan (scene list, camera paths, script, prompts).
 *
 * Claude (claude-opus-4-8) when ANTHROPIC_API_KEY is set; deterministic
 * placeholder otherwise (free, never charged). Every concept carries the
 * mandatory safety disclaimer — outputs are conceptual, NOT certified
 * engineering/CAD/construction documents.
 */
import Anthropic from "@anthropic-ai/sdk";
import { RE_DISCLAIMER } from "@/config/industrySuites";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export function willUseRealEstateAI(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ---- Wizard input ---------------------------------------------------------
export type RealEstateInput = {
  projectName: string;
  projectType?: string;
  propertyType?: string;
  country?: string;
  city?: string;
  climate?: string;
  plotSize?: string;
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  designStyle?: string;
  budget?: string;
  targetMarket?: string;
  interiorStyle?: string;
  exteriorStyle?: string;
  roofStyle?: string;
  materials?: string;
  landscapePreference?: string;
  brandName?: string;
  outputType: string;      // ReOutputType
  category?: string;       // suite category slug (optional context)
  goal?: string;           // free-text brief / template default prompt
};

// ---- Structured output ------------------------------------------------------
export type RealEstateConcept = {
  projectSummary: string;
  designConcept: string;
  styleDirection: string;
  suggestedMaterials: string[];
  colorPalette: string[];            // hex
  spacePlanningNotes: string[];
  interiorPrompt: string;
  exteriorPrompt: string;
  landscapePrompt: string;
  marketingCopy: string;
  listingDescription: string;
  socialCaptions: { platform: string; text: string }[];
  videoStoryboard: { shot: string; description: string; durationSeconds: number }[];
  walkthroughScript: string;
  recommendedExportFormat: string;
  disclaimer: string;
};

export type WalkthroughInput = {
  propertyType: string;
  features?: string;
  cameraStyle?: string;
  lightingStyle?: string;
  musicStyle?: string;
  voiceoverStyle?: string;
  duration?: number;       // seconds
  aspectRatio?: string;
  platform?: string;
};

export type WalkthroughConcept = {
  title: string;
  sceneList: { scene: string; description: string; durationSeconds: number }[];
  cameraMovement: string;
  droneShotConcepts: string[];
  interiorCameraPath: string;
  exteriorCameraPath: string;
  voiceoverScript: string;
  captionText: string;
  videoPrompt: string;
  thumbnailPrompt: string;
  socialMediaDescription: string;
  disclaimer: string;
};

// ---- Placeholders -----------------------------------------------------------
function describe(input: RealEstateInput): string {
  const bits = [
    input.bedrooms ? `${input.bedrooms}-bedroom` : "",
    input.designStyle?.toLowerCase(),
    input.propertyType?.toLowerCase() || "property",
    input.city ? `in ${input.city}` : "",
    input.country && !input.city ? `in ${input.country}` : "",
  ].filter(Boolean);
  return bits.join(" ");
}

function conceptPlaceholder(input: RealEstateInput): RealEstateConcept {
  const what = describe(input);
  const style = input.designStyle || "Modern";
  const materials = input.materials
    ? input.materials.split(",").map((m) => m.trim()).filter(Boolean)
    : ["Exposed concrete", "Natural timber", "Floor-to-ceiling glazing", "Natural stone accents"];
  return {
    projectSummary:
      `${input.projectName}: a ${what}${input.floors ? ` across ${input.floors} floor(s)` : ""}` +
      `${input.plotSize ? ` on a ${input.plotSize} plot` : ""}, designed for ${input.targetMarket || "modern buyers"}.`,
    designConcept:
      `${input.goal || `A ${style.toLowerCase()} ${input.propertyType?.toLowerCase() || "property"} concept`} — ` +
      `balancing light, flow and function, with ${input.climate ? `passive strategies suited to a ${input.climate.toLowerCase()} climate` : "climate-appropriate passive design"}.`,
    styleDirection: `${style} with ${input.interiorStyle || style} interiors and ${input.exteriorStyle || style} exterior language; ${input.roofStyle ? `${input.roofStyle.toLowerCase()} roof` : "clean rooflines"}.`,
    suggestedMaterials: materials,
    colorPalette: ["#f5f5f4", "#78716c", "#1c1917", "#a8a29e", "#84cc16"],
    spacePlanningNotes: [
      "Open-plan living/dining oriented to the primary view or garden",
      input.bedrooms ? `${input.bedrooms} bedrooms zoned away from living areas${input.bathrooms ? `, ${input.bathrooms} bathrooms` : ""}` : "Sleeping zones separated from living areas",
      "Entry sequence with sightline to a feature wall or courtyard",
      "Service spaces (laundry, storage) clustered for efficiency",
    ],
    interiorPrompt: `${input.interiorStyle || style} interior of a ${what}, natural light, layered textures, editorial photography, photorealistic, no text`,
    exteriorPrompt: `${input.exteriorStyle || style} exterior of a ${what}, ${input.roofStyle ? `${input.roofStyle.toLowerCase()} roof, ` : ""}golden hour, landscaping, photorealistic architectural photography`,
    landscapePrompt: `${input.landscapePreference || "Layered native"} landscaping for a ${what}, paths, feature lighting, photorealistic`,
    marketingCopy: `Introducing ${input.projectName} — a ${what} that blends ${style.toLowerCase()} design with everyday comfort. ${input.brandName ? `By ${input.brandName}.` : ""}`.trim(),
    listingDescription:
      `${input.projectName} offers ${input.bedrooms ?? "spacious"} bedrooms${input.bathrooms ? ` and ${input.bathrooms} bathrooms` : ""} ` +
      `in a ${style.toLowerCase()} design${input.city ? ` in the heart of ${input.city}` : ""}. Open living, quality finishes and ` +
      `${input.landscapePreference?.toLowerCase() || "landscaped"} outdoor space make this a standout offering for ${input.targetMarket || "discerning buyers"}.`,
    socialCaptions: [
      { platform: "Instagram", text: `New: ${input.projectName} ✨ ${style} living${input.city ? ` in ${input.city}` : ""}. DM for a private tour.` },
      { platform: "Facebook", text: `Just listed — ${input.projectName}. ${input.bedrooms ?? ""} bed ${style.toLowerCase()} ${input.propertyType?.toLowerCase() || "home"}. Book your viewing today.` },
      { platform: "TikTok", text: `POV: you just found your dream ${input.propertyType?.toLowerCase() || "home"} 🏡 #realestate #${style.replace(/\s+/g, "").toLowerCase()}` },
    ],
    videoStoryboard: [
      { shot: "Shot 1", description: "Drone establishing shot descending toward the property at golden hour.", durationSeconds: 6 },
      { shot: "Shot 2", description: "Entry reveal — door opens to the main living space.", durationSeconds: 5 },
      { shot: "Shot 3", description: "Kitchen and dining glide-through with detail close-ups.", durationSeconds: 6 },
      { shot: "Shot 4", description: "Primary bedroom and bathroom highlights.", durationSeconds: 5 },
      { shot: "Shot 5", description: "Outdoor living / landscape hero, closing on branding card.", durationSeconds: 6 },
    ],
    walkthroughScript:
      `Welcome to ${input.projectName}. From the moment you arrive, ${style.toLowerCase()} lines and warm materials set the tone. ` +
      `Step inside to light-filled living, a kitchen made for gathering, and private quarters designed for rest. ` +
      `Outside, ${input.landscapePreference?.toLowerCase() || "landscaped"} grounds complete the picture. ${input.projectName} — ready to welcome you home.`,
    recommendedExportFormat: input.outputType === "presentation" ? "presentation" : input.outputType === "storyboard" || input.outputType === "walkthrough" ? "storyboard" : "pdf",
    disclaimer: RE_DISCLAIMER,
  };
}

function walkthroughPlaceholder(input: WalkthroughInput): WalkthroughConcept {
  const dur = input.duration || 45;
  const scenes = [
    { scene: "Opening", description: `Drone approach of the ${input.propertyType.toLowerCase()}, ${input.lightingStyle?.toLowerCase() || "golden hour"} light.`, durationSeconds: Math.round(dur * 0.2) },
    { scene: "Arrival", description: "Front entry reveal, smooth gimbal push through the door.", durationSeconds: Math.round(dur * 0.15) },
    { scene: "Living spaces", description: `Glide through living, kitchen and dining${input.features ? `, highlighting ${input.features}` : ""}.`, durationSeconds: Math.round(dur * 0.3) },
    { scene: "Private spaces", description: "Bedrooms and bathrooms with slow detail pans.", durationSeconds: Math.round(dur * 0.2) },
    { scene: "Finale", description: "Pull-back exterior/drone rise, closing title card.", durationSeconds: Math.round(dur * 0.15) },
  ];
  return {
    title: `Walkthrough: ${input.propertyType}`,
    sceneList: scenes,
    cameraMovement: input.cameraStyle || "Smooth gimbal glides with slow push-ins; drone for exteriors.",
    droneShotConcepts: [
      "Descending reveal from above the roofline to the entry",
      "Lateral orbit at dusk showing the full facade",
      "Rise-and-tilt finale from the garden to the skyline",
    ],
    interiorCameraPath: "Entry → living → kitchen/dining → hallway → primary suite → feature bathroom, one continuous flowing path.",
    exteriorCameraPath: "Street approach → front elevation → side garden path → outdoor living → rear landscape hero.",
    voiceoverScript:
      `Step into this ${input.propertyType.toLowerCase()}${input.features ? `, featuring ${input.features}` : ""}. ` +
      `Every space is designed to impress — from the light-filled living areas to the private retreats. Book your viewing today.`,
    captionText: `Take the tour 🎥 ${input.propertyType} ${input.features ? `• ${input.features}` : ""} #propertytour #realestate`,
    videoPrompt:
      `${input.cameraStyle || "smooth gimbal"} walkthrough of a ${input.propertyType.toLowerCase()}, ` +
      `${input.lightingStyle || "golden hour"} lighting, ${input.features || "premium finishes"}, ` +
      `photorealistic, ${input.aspectRatio || "16:9"}, cinematic real estate videography`,
    thumbnailPrompt: `Hero exterior of a ${input.propertyType.toLowerCase()}, ${input.lightingStyle || "golden hour"}, striking composition, ${input.aspectRatio || "16:9"}`,
    socialMediaDescription:
      `Full video tour of this ${input.propertyType.toLowerCase()}${input.features ? ` featuring ${input.features}` : ""}. ` +
      `${input.platform ? `Made for ${input.platform}. ` : ""}Contact us to arrange a private viewing.`,
    disclaimer: RE_DISCLAIMER,
  };
}

// ---- Claude calls -------------------------------------------------------------
async function callClaude<T>(system: string, payload: unknown): Promise<T> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
    .replace(/^```json?/i, "")
    .replace(/```$/, "");
  return JSON.parse(text) as T;
}

export async function generateRealEstateConcept(
  input: RealEstateInput
): Promise<{ concept: RealEstateConcept; usedAI: boolean }> {
  if (!willUseRealEstateAI()) return { concept: conceptPlaceholder(input), usedAI: false };
  try {
    const concept = await callClaude<RealEstateConcept>(
      "You are a senior architect, interior designer and real-estate marketer. Return ONLY valid minified JSON matching: " +
        "{projectSummary,designConcept,styleDirection,suggestedMaterials:string[],colorPalette:string[](hex)," +
        "spacePlanningNotes:string[],interiorPrompt,exteriorPrompt,landscapePrompt,marketingCopy,listingDescription," +
        "socialCaptions:{platform,text}[],videoStoryboard:{shot,description,durationSeconds}[],walkthroughScript," +
        "recommendedExportFormat,disclaimer}. Image prompts must be photorealistic, text-free and paste-ready. " +
        "Space planning notes are CONCEPTUAL only — never present them as certified drawings. Tailor everything to the " +
        "brief (climate, budget, target market). Keep the requested outputType front-of-mind. No commentary.",
      input
    );
    concept.disclaimer = RE_DISCLAIMER; // always the canonical disclaimer
    if (!Array.isArray(concept.videoStoryboard) || concept.videoStoryboard.length === 0) {
      concept.videoStoryboard = conceptPlaceholder(input).videoStoryboard;
    }
    return { concept, usedAI: true };
  } catch {
    return { concept: conceptPlaceholder(input), usedAI: false };
  }
}

export async function generateWalkthroughConcept(
  input: WalkthroughInput
): Promise<{ concept: WalkthroughConcept; usedAI: boolean }> {
  if (!willUseRealEstateAI()) return { concept: walkthroughPlaceholder(input), usedAI: false };
  try {
    const concept = await callClaude<WalkthroughConcept>(
      "You are a real-estate video director. Return ONLY valid minified JSON matching: " +
        "{title,sceneList:{scene,description,durationSeconds}[],cameraMovement,droneShotConcepts:string[]," +
        "interiorCameraPath,exteriorCameraPath,voiceoverScript,captionText,videoPrompt,thumbnailPrompt," +
        "socialMediaDescription,disclaimer}. The videoPrompt must be ready for a text-to-video model. Scene durations " +
        "should roughly sum to the requested duration. Match the tone to the platform. No commentary.",
      input
    );
    concept.disclaimer = RE_DISCLAIMER;
    if (!Array.isArray(concept.sceneList) || concept.sceneList.length === 0) {
      concept.sceneList = walkthroughPlaceholder(input).sceneList;
    }
    return { concept, usedAI: true };
  } catch {
    return { concept: walkthroughPlaceholder(input), usedAI: false };
  }
}
