/**
 * AI book generation. Produces ORIGINAL concepts, outlines, chapters, editing
 * transforms, and marketing copy. Uses Claude when ANTHROPIC_API_KEY is set;
 * otherwise a deterministic placeholder so the studio always works (free).
 */
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";
export function willUseRealBookAI(): boolean { return !!process.env.ANTHROPIC_API_KEY; }

export type BookMeta = { title: string; subtitle?: string; category?: string; audience?: string; writing_style?: string; tone?: string; reading_level?: string; language?: string };

async function claudeText(system: string, user: string, max = 3000): Promise<string | null> {
  if (!willUseRealBookAI()) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({ model: MODEL, max_tokens: max, system, messages: [{ role: "user", content: user }] });
    return msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
  } catch { return null; }
}
async function claudeJSON<T>(system: string, user: string, fallback: T, max = 3000): Promise<{ data: T; usedAI: boolean }> {
  const t = await claudeText(system, user, max);
  if (!t) return { data: fallback, usedAI: false };
  try { return { data: JSON.parse(t.replace(/^```json?/i, "").replace(/```$/, "")) as T, usedAI: true }; }
  catch { return { data: fallback, usedAI: false }; }
}

const ctx = (b: BookMeta) => `Title: ${b.title}${b.subtitle ? ` — ${b.subtitle}` : ""}\nCategory: ${b.category ?? "general"}\nAudience: ${b.audience ?? "general readers"}\nStyle: ${b.writing_style ?? "professional"}\nTone: ${b.tone ?? "friendly"}\nReading level: ${b.reading_level ?? "general"}\nLanguage: ${b.language ?? "en"}`;

export type Concept = { concept: string; description: string; targetReader: string; objectives: string[]; usps: string[] };
export async function generateConcept(b: BookMeta): Promise<{ data: Concept; usedAI: boolean }> {
  const fallback: Concept = {
    concept: `${b.title} is a ${b.category ?? "practical"} book that helps ${b.audience ?? "readers"} achieve a clear outcome through an approachable, ${b.tone ?? "friendly"} narrative.`,
    description: `${b.title}${b.subtitle ? `: ${b.subtitle}` : ""} guides ${b.audience ?? "readers"} from the basics to confident application, with clear explanations and real examples.`,
    targetReader: b.audience ?? "Readers new to the topic who want a clear, structured guide.",
    objectives: ["Understand the core ideas", "Apply them step by step", "Avoid common mistakes", "Achieve a measurable result"],
    usps: ["Clear, jargon-free writing", "Actionable structure", "Real examples", "Ready-to-use takeaways"],
  };
  return claudeJSON<Concept>(
    "You are a publishing strategist. Return ONLY minified JSON {concept,description,targetReader,objectives:string[],usps:string[]}. 4 objectives, 4 USPs. Original, specific, no clichés.",
    ctx(b), fallback);
}

export type Outline = { parts: { title: string; chapters: { title: string; summary: string; objectives: string[] }[] }[] };
export async function generateOutline(b: BookMeta, chapters = 10): Promise<{ data: Outline; usedAI: boolean }> {
  const fallback: Outline = {
    parts: [{
      title: "Main",
      chapters: Array.from({ length: chapters }, (_, i) => ({
        title: `Chapter ${i + 1}: ${i === 0 ? "Introduction" : i === chapters - 1 ? "Conclusion & Next Steps" : `Key Topic ${i}`}`,
        summary: `Covers an essential part of ${b.title}, building on the previous chapter.`,
        objectives: ["Learn the key idea", "See it applied", "Practice it"],
      })),
    }],
  };
  return claudeJSON<Outline>(
    `You are a book architect. Return ONLY minified JSON {parts:[{title,chapters:[{title,summary,objectives:string[]}]}]}. Create a coherent outline with about ${chapters} chapters grouped into 1-3 parts. Each chapter: a clear title, a 1-2 sentence summary, and 2-3 learning objectives. Original structure tailored to the book.`,
    ctx(b), fallback, 3500);
}

export async function generateChapter(b: BookMeta, chapterTitle: string, summary?: string): Promise<{ content: string; usedAI: boolean }> {
  const fallbackContent = `# ${chapterTitle}\n\n${summary ?? `This chapter explores ${chapterTitle} in the context of ${b.title}.`}\n\nWrite your chapter here. (Set ANTHROPIC_API_KEY to auto-draft full chapters.)\n\n## Key points\n\n- Point one\n- Point two\n- Point three\n\n## Summary\n\nA short recap of the chapter's main idea and a bridge to what comes next.`;
  const t = await claudeText(
    `You are a professional author writing ORIGINAL prose for a book. Write the full chapter in Markdown (use ## subheadings). Match the style/tone/reading level. Do NOT reproduce any copyrighted text. ${ctx(b)}`,
    `Write the chapter titled "${chapterTitle}".${summary ? ` Summary: ${summary}` : ""} Aim for a complete, well-structured chapter (~800-1200 words).`,
    4096);
  return { content: t ?? fallbackContent, usedAI: !!t };
}

export type ChapterAction = "rewrite" | "expand" | "shorten" | "continue" | "summarize" | "improve" | "grammar" | "examples" | "tone";
export async function chapterTool(action: ChapterAction, content: string, b: BookMeta, extra?: string): Promise<{ content: string; usedAI: boolean }> {
  const instructions: Record<ChapterAction, string> = {
    rewrite: "Rewrite the text, keeping the meaning but improving flow and clarity.",
    expand: "Expand the text with more depth, detail, and examples.",
    shorten: "Shorten the text while keeping the key points.",
    continue: "Continue the text naturally from where it ends.",
    summarize: "Summarize the text concisely.",
    improve: "Improve clarity, structure, and readability.",
    grammar: "Fix grammar, spelling, and punctuation only; keep wording otherwise.",
    examples: "Add concrete, original examples that illustrate the points.",
    tone: `Rewrite in a ${extra ?? "more engaging"} tone.`,
  };
  const t = await claudeText(
    `You are an expert book editor. Return ONLY the edited Markdown text, no commentary. ${ctx(b)}`,
    `${instructions[action]}\n\nText:\n${content}`, 4096);
  if (t) return { content: t, usedAI: true };
  return { content: content + `\n\n_(${action} requires ANTHROPIC_API_KEY — edit manually for now.)_`, usedAI: false };
}

export async function generateMarketing(b: BookMeta, type: string): Promise<{ content: string; usedAI: boolean }> {
  const prompts: Record<string, string> = {
    description: "Write a compelling 150-word book description.",
    amazon: "Write an Amazon-style listing: a hook, 5 bullet benefits, and a closing line.",
    landing: "Write landing-page copy: headline, subhead, 3 benefits, and a CTA.",
    email: "Write a 3-email launch sequence (subject + short body each).",
    social: "Write 5 social captions promoting the book, with hashtags.",
    video_script: "Write a 30-second promotional video script (scenes + voiceover).",
    checklist: "Write a book launch checklist (10-15 steps).",
  };
  const t = await claudeText(
    `You are a book-marketing copywriter. Output clean Markdown. Original copy only. ${ctx(b)}`,
    `${prompts[type] ?? prompts.description}`, 2500);
  return { content: t ?? `**${type}** for ${b.title}\n\n(Set ANTHROPIC_API_KEY to auto-generate marketing copy.)`, usedAI: !!t };
}
