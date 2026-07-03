/**
 * Professional Industry Suites — the scalable registry that keeps Design
 * Studio organized per industry instead of one giant template library.
 *
 * Real Estate & Architecture is the first ACTIVE suite; the other twelve are
 * registered as coming_soon so the platform (nav, hub page, admin) already
 * knows about them. Adding a future suite = flip status + add its category
 * groups + templates. Admin can also extend suites/templates via the
 * industry_* tables (migration 0028) without a deploy.
 */

export type SuiteStatus = "active" | "coming_soon";

export type IndustrySuite = {
  id: string;            // slug
  name: string;
  icon: string;          // lucide icon name (resolved in components)
  description: string;
  status: SuiteStatus;
  order: number;
  /** Studios this suite hands off to (shown as "Related Studios"). */
  integrations: { label: string; href: string }[];
};

export type SuiteCategoryGroup = {
  id: string;
  name: string;
  description: string;
  categories: string[];  // display names; slug = kebab-case
  order: number;
};

export const INDUSTRY_SUITES: IndustrySuite[] = [
  {
    id: "real-estate-architecture", name: "Real Estate & Architecture", icon: "Building2",
    description: "Property marketing, architectural concepts, floor plans, interiors, landscapes and AI walkthroughs.",
    status: "active", order: 1,
    integrations: [
      { label: "Video Studio", href: "/dashboard/projects/new" },
      { label: "AI Advertising Studio", href: "/dashboard/ads/create" },
      { label: "Publishing Calendar", href: "/dashboard/calendar" },
    ],
  },
  { id: "ecommerce-design", name: "Ecommerce Design", icon: "ShoppingBag", description: "Product visuals, store banners, promos and marketplace creatives.", status: "coming_soon", order: 2, integrations: [] },
  { id: "restaurant-hospitality", name: "Restaurant & Hospitality", icon: "UtensilsCrossed", description: "Menus, food photography concepts, promos and venue branding.", status: "coming_soon", order: 3, integrations: [] },
  { id: "healthcare", name: "Healthcare", icon: "HeartPulse", description: "Clinic branding, patient materials and health campaign visuals.", status: "coming_soon", order: 4, integrations: [] },
  { id: "education", name: "Education", icon: "GraduationCap", description: "Course covers, school branding and learning materials.", status: "coming_soon", order: 5, integrations: [] },
  { id: "legal", name: "Legal", icon: "Scale", description: "Law firm branding, proposals and client documents.", status: "coming_soon", order: 6, integrations: [] },
  { id: "finance", name: "Finance", icon: "Landmark", description: "Financial branding, investor decks and report visuals.", status: "coming_soon", order: 7, integrations: [] },
  { id: "construction", name: "Construction", icon: "HardHat", description: "Site branding, project profiles and construction reports.", status: "coming_soon", order: 8, integrations: [] },
  { id: "automotive", name: "Automotive", icon: "Car", description: "Dealership creatives, vehicle promos and brand kits.", status: "coming_soon", order: 9, integrations: [] },
  { id: "fashion-beauty", name: "Fashion & Beauty", icon: "Sparkles", description: "Lookbooks, campaign visuals and salon branding.", status: "coming_soon", order: 10, integrations: [] },
  { id: "travel-tourism", name: "Travel & Tourism", icon: "Plane", description: "Destination promos, tour brochures and travel social content.", status: "coming_soon", order: 11, integrations: [] },
  { id: "event-management", name: "Event Management", icon: "CalendarDays", description: "Event branding, invitations, posters and recap visuals.", status: "coming_soon", order: 12, integrations: [] },
  { id: "manufacturing", name: "Manufacturing", icon: "Factory", description: "Industrial branding, product sheets and capability decks.", status: "coming_soon", order: 13, integrations: [] },
];

export const getSuiteBySlug = (slug: string): IndustrySuite | undefined =>
  INDUSTRY_SUITES.find((s) => s.id === slug);

// ---- Real Estate & Architecture category groups ---------------------------
export const REAL_ESTATE_GROUPS: SuiteCategoryGroup[] = [
  {
    id: "architectural", name: "Architectural Concepts", order: 1,
    description: "Whole-building design concepts by property type.",
    categories: [
      "Residential House Concepts", "Luxury Villa Concepts", "Apartment Concepts", "Duplex Concepts",
      "Tiny House Concepts", "Townhouse Concepts", "Smart Home Concepts", "Modern House Concepts",
      "Traditional House Concepts", "Eco-Friendly House Concepts", "Commercial Building Concepts",
      "Mixed-Use Building Concepts",
    ],
  },
  {
    id: "floorplan", name: "Floor Plan Concepts", order: 2,
    description: "Space-planning layout concepts (conceptual, not CAD).",
    categories: [
      "Studio Apartment Layout", "1 Bedroom Layout", "2 Bedroom Layout", "3 Bedroom Layout",
      "4 Bedroom Layout", "5 Bedroom Layout", "Mansion Layout", "Office Layout", "Restaurant Layout",
      "Retail Store Layout", "Warehouse Layout", "Hotel Layout", "School Layout", "Hospital Layout",
      "Church Layout",
    ],
  },
  {
    id: "exterior", name: "Exterior Design Concepts", order: 3,
    description: "Elevations, facades and street-view concepts.",
    categories: [
      "Front Elevation Concept", "Rear Elevation Concept", "Side Elevation Concept", "Contemporary Exterior",
      "Luxury Exterior", "Minimalist Exterior", "Commercial Exterior", "Apartment Exterior", "Resort Exterior",
      "Urban Street View Concept", "Night Exterior Concept", "Day Exterior Concept",
    ],
  },
  {
    id: "interior", name: "Interior Design Concepts", order: 4,
    description: "Room-by-room interior styling concepts.",
    categories: [
      "Living Room", "Kitchen", "Bedroom", "Bathroom", "Dining Room", "Office", "Reception", "Hotel Lobby",
      "Restaurant Interior", "Retail Shop Interior", "Salon Interior", "Gym Interior", "Classroom",
      "Hospital Waiting Room", "Cinema Room", "Gaming Room",
    ],
  },
  {
    id: "landscape", name: "Landscape Design Concepts", order: 5,
    description: "Outdoor spaces, gardens and site landscaping.",
    categories: [
      "Garden", "Swimming Pool", "Driveway", "Patio", "Balcony", "Terrace", "Courtyard", "Outdoor Kitchen",
      "Children's Playground", "Commercial Landscaping", "Resort Landscaping", "Rooftop Garden",
    ],
  },
  {
    id: "materials", name: "Construction & Material Concepts", order: 6,
    description: "Finishes, materials, palettes and detailing.",
    categories: [
      "Construction Mood Board", "Exterior Finishes", "Interior Finishes", "Roofing Concepts",
      "Lighting Concepts", "Color Schemes", "Facade Concepts", "Window Styles", "Door Styles",
      "Flooring Concepts", "Wall Finish Concepts", "Ceiling Concepts",
    ],
  },
  {
    id: "marketing", name: "Real Estate Marketing Designs", order: 7,
    description: "Listing and campaign assets that sell properties.",
    categories: [
      "Property Flyer", "Property Brochure", "Luxury Property Presentation", "Open House Flyer",
      "For Sale Poster", "For Rent Poster", "Social Media Property Ad", "Facebook Property Ad",
      "Instagram Property Post", "TikTok Property Video Concept", "YouTube Property Thumbnail",
      "Property Landing Page", "Property Email Campaign", "Property Video Storyboard",
    ],
  },
  {
    id: "branding", name: "Property Branding", order: 8,
    description: "Agency and developer brand identities.",
    categories: [
      "Real Estate Agency Logo Concept", "Property Developer Logo Concept", "Property Brand Kit",
      "Business Card", "Property Signboard", "Billboard", "Office Branding", "Sales Presentation",
      "Investor Presentation",
    ],
  },
  {
    id: "visualization", name: "3D Visualization Concepts", order: 9,
    description: "Photorealistic render and camera-view prompts.",
    categories: [
      "Photorealistic Exterior Concept", "Photorealistic Interior Concept", "Luxury Visualization Concept",
      "Drone View Concept", "Bird's Eye View Concept", "Street View Concept", "Interior Walkthrough Scene",
      "Exterior Walkthrough Scene",
    ],
  },
  {
    id: "documents", name: "Real Estate Documents", order: 10,
    description: "Proposals, decks and listing documents.",
    categories: [
      "Property Proposal", "Investment Proposal", "Construction Proposal", "Property Portfolio", "Sales Deck",
      "Project Profile", "Construction Report", "Client Presentation", "Project Timeline",
      "Property Listing Description",
    ],
  },
];

export function slugifySuiteCategory(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Flat lookup: category slug → { name, groupId } for the real estate suite. */
export const REAL_ESTATE_CATEGORY_INDEX: Record<string, { name: string; groupId: string }> =
  Object.fromEntries(
    REAL_ESTATE_GROUPS.flatMap((g) =>
      g.categories.map((name) => [slugifySuiteCategory(name), { name, groupId: g.id }])
    )
  );

// ---- Wizard configuration ---------------------------------------------------
export type ReOutputType =
  | "concept_prompt" | "floor_plan" | "interior" | "exterior" | "landscape"
  | "marketing" | "presentation" | "storyboard" | "walkthrough";

export const RE_OUTPUT_TYPES: { id: ReOutputType; label: string; credits: number }[] = [
  { id: "concept_prompt", label: "Concept Prompt", credits: 8 },
  { id: "floor_plan", label: "Floor Plan Concept", credits: 10 },
  { id: "interior", label: "Interior Concept", credits: 8 },
  { id: "exterior", label: "Exterior Concept", credits: 8 },
  { id: "landscape", label: "Landscape Concept", credits: 8 },
  { id: "marketing", label: "Marketing Asset", credits: 6 },
  { id: "presentation", label: "Presentation", credits: 12 },
  { id: "storyboard", label: "Video Storyboard", credits: 10 },
  { id: "walkthrough", label: "Property Walkthrough Concept", credits: 12 },
];

export const getReOutputType = (id: string) =>
  RE_OUTPUT_TYPES.find((o) => o.id === id) ?? RE_OUTPUT_TYPES[0];

export const RE_PROJECT_TYPES = ["Residential", "Commercial", "Mixed-Use", "Hospitality", "Industrial", "Institutional"];
export const RE_PROPERTY_TYPES = [
  "House", "Luxury Villa", "Apartment", "Duplex", "Townhouse", "Tiny House", "Mansion",
  "Office", "Retail Store", "Restaurant", "Hotel", "Resort", "Warehouse", "School", "Hospital", "Church",
];
export const RE_DESIGN_STYLES = ["Modern", "Contemporary", "Minimalist", "Traditional", "Mediterranean", "Scandinavian", "Industrial", "Tropical", "Colonial", "Futuristic", "Eco-Friendly", "Luxury"];
export const RE_ROOF_STYLES = ["Flat", "Gable", "Hip", "Shed", "Mansard", "Butterfly", "Green roof", "Mixed"];

/** Mandatory disclaimer shown with every generated concept. */
export const RE_DISCLAIMER =
  "CreatorForge.io generates conceptual design, marketing, and visualization materials. " +
  "Architectural, engineering, legal, and construction decisions should be reviewed by qualified " +
  "professionals before use. AI-generated floor plan concepts are not certified drawings.";
