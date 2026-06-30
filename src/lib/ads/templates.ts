/** Industry starter templates (mirrors the 0019 seed; used as a fallback before
 *  the migration runs so the campaign wizard always has templates). */
export type AdTemplate = {
  slug: string; name: string; objective: string;
  suggested_copy: string; creative_ideas: string[]; recommended_formats: string[]; suggested_cta: string;
};

export const AD_TEMPLATES: AdTemplate[] = [
  { slug: "ecommerce", name: "Ecommerce", objective: "sales", suggested_copy: "Showcase your best-selling product with a clear offer and urgency.", creative_ideas: ["Product hero shot", "Before/after", "UGC unboxing"], recommended_formats: ["image", "carousel", "short_video"], suggested_cta: "Shop Now" },
  { slug: "saas", name: "SaaS", objective: "leads", suggested_copy: "Lead with the problem you solve and a free trial.", creative_ideas: ["Dashboard demo", "Feature highlight", "Customer quote"], recommended_formats: ["video", "image", "lead_form"], suggested_cta: "Start Free Trial" },
  { slug: "real_estate", name: "Real Estate", objective: "leads", suggested_copy: "Highlight the listing's standout features and location.", creative_ideas: ["Property walkthrough", "Neighborhood shots", "Agent intro"], recommended_formats: ["carousel", "video", "lead_form"], suggested_cta: "Book a Viewing" },
  { slug: "restaurants", name: "Restaurants", objective: "traffic", suggested_copy: "Make the food the star; add a limited-time offer.", creative_ideas: ["Dish close-ups", "Ambience reel", "Chef intro"], recommended_formats: ["image", "short_video", "story"], suggested_cta: "Order Now" },
  { slug: "healthcare", name: "Healthcare", objective: "leads", suggested_copy: "Build trust with credentials and clear, caring language.", creative_ideas: ["Clinic tour", "Staff intro", "Patient testimonial"], recommended_formats: ["video", "image", "lead_form"], suggested_cta: "Book Appointment" },
  { slug: "education", name: "Education", objective: "leads", suggested_copy: "Sell the outcome and the transformation.", creative_ideas: ["Course preview", "Student results", "Instructor intro"], recommended_formats: ["video", "carousel", "lead_form"], suggested_cta: "Enroll Today" },
  { slug: "fashion", name: "Fashion", objective: "sales", suggested_copy: "Lead with style and the look; drive to the collection.", creative_ideas: ["Lookbook", "Model reel", "Flat-lay"], recommended_formats: ["carousel", "short_video", "collection"], suggested_cta: "Shop the Look" },
  { slug: "beauty", name: "Beauty", objective: "sales", suggested_copy: "Show the result; use UGC and before/after.", creative_ideas: ["Before/after", "Application demo", "UGC review"], recommended_formats: ["short_video", "image", "collection"], suggested_cta: "Shop Now" },
  { slug: "travel", name: "Travel", objective: "awareness", suggested_copy: "Sell the feeling and the destination.", creative_ideas: ["Destination reel", "Itinerary teaser", "Guest moments"], recommended_formats: ["video", "carousel", "story"], suggested_cta: "Plan Your Trip" },
  { slug: "fitness", name: "Fitness", objective: "leads", suggested_copy: "Promise a clear result and a simple first step.", creative_ideas: ["Transformation", "Workout reel", "Coach intro"], recommended_formats: ["short_video", "image", "lead_form"], suggested_cta: "Start Now" },
  { slug: "events", name: "Events", objective: "engagement", suggested_copy: "Create urgency around the date and lineup.", creative_ideas: ["Highlight reel", "Speaker/lineup", "Countdown"], recommended_formats: ["video", "story", "image"], suggested_cta: "Get Tickets" },
  { slug: "local_business", name: "Local Business", objective: "traffic", suggested_copy: "Emphasize locality, reviews, and a clear offer.", creative_ideas: ["Storefront", "Team intro", "Customer reviews"], recommended_formats: ["image", "short_video", "carousel"], suggested_cta: "Visit Us" },
];
