/**
 * Subtitle generation. Turns narration segments into timed cues and serializes
 * them to SRT or VTT. Timing is naive (≈2.5 words/second), good enough as a
 * foundation that users can edit before a real alignment pass.
 */

export type Cue = { start: number; end: number; text: string };

const WORDS_PER_SECOND = 2.5;

/** Build timed cues from an ordered list of narration segments. */
export function buildCues(segments: string[]): Cue[] {
  const cues: Cue[] = [];
  let clock = 0;
  for (const segment of segments) {
    const text = segment.trim();
    if (!text) continue;
    const words = text.split(/\s+/).filter(Boolean).length;
    const duration = Math.max(1.5, words / WORDS_PER_SECOND);
    cues.push({ start: clock, end: clock + duration, text });
    clock += duration;
  }
  return cues;
}

function fmt(seconds: number, sep: "," | "."): string {
  const ms = Math.floor((seconds % 1) * 1000);
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms, 3)}`;
}

export function toSRT(cues: Cue[]): string {
  return cues
    .map((c, i) => `${i + 1}\n${fmt(c.start, ",")} --> ${fmt(c.end, ",")}\n${c.text}`)
    .join("\n\n")
    .concat("\n");
}

export function toVTT(cues: Cue[]): string {
  const body = cues
    .map((c) => `${fmt(c.start, ".")} --> ${fmt(c.end, ".")}\n${c.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

export function serializeCaptions(cues: Cue[], format: "srt" | "vtt"): string {
  return format === "vtt" ? toVTT(cues) : toSRT(cues);
}
