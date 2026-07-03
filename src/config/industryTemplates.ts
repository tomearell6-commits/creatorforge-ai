/**
 * Built-in Industry Suite templates. Ship in code so the suite is never empty;
 * admins can add more via the industry_templates table (migration 0028) —
 * the API merges both. Viewing templates is always free; the estimated
 * credits apply only when the user generates from one.
 */
import type { ReOutputType } from "./industrySuites";
import { slugifySuiteCategory } from "./industrySuites";

export type IndustryTemplate = {
  id: string;
  name: string;
  slug: string;
  industrySuite: string;       // suite slug
  category: string;            // category slug within the suite
  outputType: ReOutputType;
  description: string;
  requiredInputs: string[];    // wizard fields this template needs
  defaultPrompt: string;       // seeds the wizard's goal/prompt
  previewIcon: string;         // lucide icon name (preview image placeholder)
  estimatedCredits: number;
  exportFormats: string[];
  tags: string[];
  isFeatured?: boolean;
  isPremium?: boolean;
};

const RE = "real-estate-architecture";
const t = (
  name: string, category: string, outputType: ReOutputType, description: string,
  defaultPrompt: string, opts: Partial<IndustryTemplate> = {}
): IndustryTemplate => ({
  id: `re-${slugifySuiteCategory(name)}`,
  name,
  slug: slugifySuiteCategory(name),
  industrySuite: RE,
  category: slugifySuiteCategory(category),
  outputType,
  description,
  requiredInputs: opts.requiredInputs ?? ["projectName", "propertyType", "designStyle"],
  defaultPrompt,
  previewIcon: opts.previewIcon ?? "Building2",
  estimatedCredits: opts.estimatedCredits ?? 8,
  exportFormats: opts.exportFormats ?? ["png", "jpg", "pdf", "prompt_package"],
  tags: opts.tags ?? [],
  isFeatured: opts.isFeatured ?? false,
  isPremium: opts.isPremium ?? false,
});

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  t("Luxury Villa", "Luxury Villa Concepts", "concept_prompt",
    "Full concept for a high-end villa: architecture, interiors, landscape and marketing angle.",
    "A luxury 5-bedroom villa with infinity pool, floor-to-ceiling glass, and resort-style landscaping",
    { previewIcon: "Gem", estimatedCredits: 10, tags: ["luxury", "villa", "residential"], isFeatured: true, isPremium: true }),
  t("Family House", "Residential House Concepts", "concept_prompt",
    "Warm, practical family home concept with functional space planning.",
    "A modern 4-bedroom family house with open kitchen, garden and double garage",
    { previewIcon: "Home", tags: ["residential", "family"], isFeatured: true }),
  t("Apartment", "Apartment Concepts", "concept_prompt",
    "Urban apartment building or unit concept with efficient layouts.",
    "A contemporary 2-bedroom city apartment with balcony and smart storage",
    { previewIcon: "Building", tags: ["apartment", "urban"] }),
  t("Office", "Office Layout", "floor_plan",
    "Workplace layout concept balancing focus, collaboration and flow.",
    "An open-plan office for 40 people with 4 meeting rooms, phone booths and a lounge",
    { previewIcon: "Briefcase", estimatedCredits: 10, tags: ["office", "commercial"] }),
  t("Shopping Mall", "Commercial Building Concepts", "concept_prompt",
    "Retail destination concept: anchor zones, circulation and facade direction.",
    "A three-level shopping mall with central atrium, food court and cinema anchor",
    { previewIcon: "Store", estimatedCredits: 12, tags: ["retail", "commercial"], isPremium: true }),
  t("Hotel", "Hotel Layout", "floor_plan",
    "Hospitality layout concept: lobby, rooms mix, amenities and back-of-house.",
    "A 120-room boutique hotel with rooftop bar, spa and conference wing",
    { previewIcon: "Hotel", estimatedCredits: 12, tags: ["hotel", "hospitality"] }),
  t("Restaurant", "Restaurant Layout", "floor_plan",
    "Dining layout concept: covers, kitchen flow and guest experience.",
    "An 80-seat restaurant with open kitchen, bar and private dining room",
    { previewIcon: "UtensilsCrossed", tags: ["restaurant", "hospitality"] }),
  t("Resort", "Resort Exterior", "exterior",
    "Resort exterior and site concept with landscape integration.",
    "A beachfront resort with villas, lagoon pools and palm-lined walkways",
    { previewIcon: "Palmtree", estimatedCredits: 10, tags: ["resort", "hospitality"], isPremium: true }),
  t("Hospital", "Hospital Layout", "floor_plan",
    "Care-facility layout concept: departments, wayfinding and patient flow.",
    "A regional hospital with emergency, outpatient, imaging and 200 beds",
    { previewIcon: "HeartPulse", estimatedCredits: 12, tags: ["healthcare", "institutional"] }),
  t("School", "School Layout", "floor_plan",
    "Learning-campus layout concept: classrooms, labs and shared spaces.",
    "A secondary school for 800 students with science labs, library and sports hall",
    { previewIcon: "GraduationCap", tags: ["education", "institutional"] }),
  t("Warehouse", "Warehouse Layout", "floor_plan",
    "Logistics layout concept: racking, docks and operations flow.",
    "A 10,000 sqm distribution warehouse with 12 docks and mezzanine offices",
    { previewIcon: "Warehouse", tags: ["industrial", "logistics"] }),
  t("Factory", "Commercial Building Concepts", "concept_prompt",
    "Production facility concept: process flow, staff areas and site plan.",
    "A light-manufacturing factory with production hall, QA lab and staff hub",
    { previewIcon: "Factory", tags: ["industrial", "manufacturing"] }),
  t("Church", "Church Layout", "floor_plan",
    "Worship-space layout concept: sanctuary, fellowship and support areas.",
    "A 500-seat church with fellowship hall, classrooms and ample parking",
    { previewIcon: "Church", tags: ["institutional", "community"] }),
  t("Mixed-Use Building", "Mixed-Use Building Concepts", "concept_prompt",
    "Ground-floor retail + upper residential/office concept.",
    "A six-storey mixed-use block: retail podium, two office floors, apartments above",
    { previewIcon: "Building2", estimatedCredits: 12, tags: ["mixed-use", "urban"] }),
  t("Retail Store", "Retail Store Layout", "floor_plan",
    "Store layout concept: customer journey, displays and checkout.",
    "A 300 sqm fashion retail store with fitting rooms and feature displays",
    { previewIcon: "Store", tags: ["retail"] }),
  t("Cafe", "Restaurant Interior", "interior",
    "Cafe interior concept: seating mix, counter and atmosphere.",
    "A cozy specialty-coffee cafe with 40 seats, banquettes and warm timber",
    { previewIcon: "Coffee", tags: ["cafe", "hospitality"] }),
  t("Salon", "Salon Interior", "interior",
    "Salon interior concept: stations, wash area and retail wall.",
    "A modern hair salon with 8 stations, wash lounge and product display",
    { previewIcon: "Scissors", tags: ["salon", "beauty"] }),
  t("Gym", "Gym Interior", "interior",
    "Fitness interior concept: zones, flooring and lighting.",
    "A 600 sqm gym with strength zone, cardio deck, studio and recovery area",
    { previewIcon: "Dumbbell", tags: ["gym", "fitness"] }),
  t("Co-working Space", "Office Layout", "floor_plan",
    "Flexible workspace concept: desks, studios, cafe and event space.",
    "A co-working hub with 120 desks, 10 private studios, podcast room and cafe",
    { previewIcon: "Users", estimatedCredits: 10, tags: ["coworking", "office"] }),
  t("Property Investment Deck", "Investor Presentation", "presentation",
    "Investor-ready deck structure with narrative and visuals plan.",
    "An investment deck for a 40-unit residential development seeking funding",
    { previewIcon: "TrendingUp", estimatedCredits: 12, exportFormats: ["pdf", "presentation", "prompt_package"], tags: ["investment", "deck"], isFeatured: true, isPremium: true }),
  t("Property Listing Flyer", "Property Flyer", "marketing",
    "Print/social flyer concept with copy, layout and photo prompts.",
    "A for-sale flyer for a 3-bedroom home with garden, near schools",
    { previewIcon: "FileText", estimatedCredits: 6, exportFormats: ["png", "jpg", "pdf"], tags: ["flyer", "listing"], isFeatured: true }),
  t("Real Estate Facebook Ad", "Facebook Property Ad", "marketing",
    "Scroll-stopping ad creative concept with copy variants and CTA.",
    "A Facebook ad for an open house this weekend, family-friendly suburb",
    { previewIcon: "Megaphone", estimatedCredits: 6, exportFormats: ["png", "jpg"], tags: ["ad", "facebook"] }),
  t("Real Estate Instagram Post", "Instagram Property Post", "marketing",
    "Feed-ready property post concept with caption and hashtags.",
    "An Instagram post showcasing a new luxury listing with sunset exterior",
    { previewIcon: "Instagram", estimatedCredits: 6, exportFormats: ["png", "jpg"], tags: ["instagram", "social"] }),
  t("Property Walkthrough Video", "Property Video Storyboard", "walkthrough",
    "Full walkthrough concept: scene list, camera paths, script and prompts.",
    "A 45-second cinematic walkthrough of a modern villa, drone opening shot",
    { previewIcon: "Clapperboard", estimatedCredits: 12, exportFormats: ["storyboard", "prompt_package", "pdf"], tags: ["video", "walkthrough"], isFeatured: true }),
];

export const getIndustryTemplatesForSuite = (suiteSlug: string): IndustryTemplate[] =>
  INDUSTRY_TEMPLATES.filter((x) => x.industrySuite === suiteSlug);

export const getIndustryTemplateBySlug = (slug: string): IndustryTemplate | undefined =>
  INDUSTRY_TEMPLATES.find((x) => x.slug === slug);
