/** Book starter templates (mirrors the 0020 seed; fallback before migration). */
export type BookTemplate = { slug: string; name: string; category: string; description: string };

export const BOOK_TEMPLATES: BookTemplate[] = [
  { slug: "business", name: "Business Book", category: "Business", description: "Frameworks, case studies, and actionable takeaways." },
  { slug: "children", name: "Children's Book", category: "Children's Books", description: "Short, illustrated, age-appropriate storytelling." },
  { slug: "fantasy", name: "Fantasy Novel", category: "Fantasy", description: "World-building, arcs, and chapter beats." },
  { slug: "romance", name: "Romance Novel", category: "Romance", description: "Character-driven arcs with emotional beats." },
  { slug: "self_help", name: "Self Help", category: "Self Help", description: "Problem → method → steps → results." },
  { slug: "cookbook", name: "Cookbook", category: "Cookbooks", description: "Intro, technique, and structured recipes." },
  { slug: "biography", name: "Biography", category: "Biography", description: "Chronological life story with themes." },
  { slug: "memoir", name: "Memoir", category: "Memoir", description: "First-person narrative around a central theme." },
  { slug: "workbook", name: "Educational Workbook", category: "Educational", description: "Lessons + exercises + answer keys." },
  { slug: "prompt_book", name: "Prompt Book", category: "Prompt Books", description: "Curated prompts grouped by use case." },
  { slug: "lead_magnet", name: "Lead Magnet", category: "Lead Magnets", description: "Short, high-value guide with a CTA." },
  { slug: "course_companion", name: "Course Companion", category: "Educational", description: "Companion workbook to a course." },
  { slug: "startup_guide", name: "Startup Guide", category: "Entrepreneurship", description: "Step-by-step startup playbook." },
  { slug: "marketing_playbook", name: "Marketing Playbook", category: "Marketing", description: "Tactics, templates, and checklists." },
  { slug: "investment_guide", name: "Investment Guide", category: "Investing", description: "Concepts, strategies, risk management." },
  { slug: "travel_guide", name: "Travel Guide", category: "Travel", description: "Destinations, itineraries, tips." },
  { slug: "training_manual", name: "Training Manual", category: "Product Guides", description: "Procedures, SOPs, and reference." },
  { slug: "journal", name: "Journal", category: "Journals", description: "Guided prompts and reflection pages." },
  { slug: "custom", name: "Custom Book", category: "Custom Category", description: "Start from a blank, flexible structure." },
];
