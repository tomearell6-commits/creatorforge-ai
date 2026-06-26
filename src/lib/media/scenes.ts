/**
 * Deterministic scene splitter. Parses a generated script into structured
 * scenes (one per labeled beat like [HOOK], [SCENE 1], [CALL TO ACTION]).
 * Falls back to paragraph splitting when no bracketed beats are present.
 */

const CAMERA_DIRECTIONS = [
  "Slow push-in on subject",
  "Wide establishing shot",
  "Handheld tracking shot",
  "Static medium close-up",
  "Overhead top-down angle",
  "Dramatic low-angle shot",
];

const TRANSITIONS = ["cut", "fade", "slide", "zoom", "dissolve"];

export type ParsedScene = {
  position: number;
  title: string;
  narration: string;
  visual_description: string;
  image_prompt: string;
  video_prompt: string;
  camera_direction: string;
  transition: string;
  duration: number;
};

function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 2.5)); // ~2.5 words/second
}

function firstSentence(text: string): string {
  const match = text.match(/[^.!?\n]+[.!?]?/);
  return (match ? match[0] : text).trim();
}

export function splitScriptIntoScenes(scriptText: string): ParsedScene[] {
  const lines = scriptText.split(/\r?\n/);
  const blocks: { title: string; body: string[] }[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Skip markdown headings / metadata lines.
    if (line.startsWith("#") || line.startsWith("Category:")) continue;
    if (line === "---") continue;

    const header = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (header) {
      blocks.push({ title: titleCase(header[1]), body: header[2] ? [header[2]] : [] });
    } else if (blocks.length > 0) {
      blocks[blocks.length - 1].body.push(line);
    } else {
      // Content before any header → start an Intro block.
      blocks.push({ title: "Intro", body: [line] });
    }
  }

  // Fallback: no labeled beats → split into paragraphs.
  let working = blocks.filter((b) => b.body.join(" ").trim().length > 0);
  if (working.length === 0) {
    working = scriptText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p, i) => ({ title: `Scene ${i + 1}`, body: [p] }));
  }

  return working.map((b, i) => {
    const narration = b.body.join(" ").trim();
    const visual = firstSentence(narration);
    return {
      position: i,
      title: b.title,
      narration,
      visual_description: visual,
      image_prompt: `Cinematic still, ${visual} — high detail, dramatic lighting, 16:9`,
      video_prompt: `${CAMERA_DIRECTIONS[i % CAMERA_DIRECTIONS.length]}, ${visual} — smooth motion, cinematic`,
      camera_direction: CAMERA_DIRECTIONS[i % CAMERA_DIRECTIONS.length],
      transition: TRANSITIONS[i % TRANSITIONS.length],
      duration: estimateDuration(narration),
    };
  });
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
