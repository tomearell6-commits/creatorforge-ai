/**
 * Live AI Footage Designer. Turns a scene idea + shot parameters into a
 * structured FootageConcept (video prompt, shot list, camera direction,
 * thumbnail frame, voiceover, caption) that feeds the Video Studio / Ad Studio
 * before any actual video generation. Claude when configured, else placeholder.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { FootageConcept, FootageInput } from "./types";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export function willUseRealFootageAI(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function placeholder(input: FootageInput): FootageConcept {
  const subject = input.subject || "the subject";
  const duration = input.duration || 8;
  const shots = Math.max(2, Math.min(5, Math.round(duration / 3)));
  const per = Math.round(duration / shots);
  return {
    title: `Footage concept: ${input.sceneIdea.slice(0, 60)}`,
    videoPrompt:
      `${input.motionStyle || "smooth cinematic"} shot of ${subject}, ${input.sceneIdea}, ` +
      `${input.cameraStyle || "slow dolly"}, ${input.lighting || "soft natural light"}, ` +
      `${input.background || "clean background"}, ${input.aspectRatio || "16:9"}, high detail, photorealistic`,
    sceneScript: `Open on ${subject}. ${input.sceneIdea}. Build to a clear hero moment, then resolve on a confident final frame.`,
    shotList: Array.from({ length: shots }, (_, i) => ({
      shot: `Shot ${i + 1}`,
      description:
        i === 0
          ? `Establishing ${input.cameraStyle || "wide"} shot of ${subject}.`
          : i === shots - 1
            ? `Hero close-up of ${subject} with ${input.lighting || "soft"} light.`
            : `Motion beat: ${input.motionStyle || "smooth pan"} across ${subject}.`,
      durationSeconds: per,
    })),
    cameraDirection: input.cameraStyle || "Slow dolly-in with a subtle handheld feel; keep the subject centered.",
    visualStyle: `${input.lighting || "Soft natural"} lighting, ${input.background || "minimal background"}, cinematic color.`,
    lighting: input.lighting || "Soft natural key with gentle rim light.",
    thumbnailFramePrompt: `Best still frame: ${subject}, ${input.lighting || "soft light"}, ${input.aspectRatio || "16:9"}, striking composition`,
    suggestedVoiceover: `"${input.sceneIdea}." Keep it under ${Math.max(6, duration)} seconds, warm and confident.`,
    captionText: `${input.sceneIdea} ✨ ${input.platform ? `#${input.platform.replace(/\s+/g, "")}` : "#CreatorsForge"}`,
  };
}

export async function generateFootageConcept(
  input: FootageInput
): Promise<{ concept: FootageConcept; usedAI: boolean }> {
  if (!willUseRealFootageAI()) return { concept: placeholder(input), usedAI: false };
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system:
        "You are a video director and prompt engineer for AI video models. Return ONLY valid minified JSON matching: " +
        "{title,videoPrompt,sceneScript,shotList:{shot,description,durationSeconds}[],cameraDirection,visualStyle," +
        "lighting,thumbnailFramePrompt,suggestedVoiceover,captionText}. The videoPrompt must be ready to paste into a " +
        "text-to-video model (Kling/Veo/Luma). Total shot durations should roughly match the requested duration. No commentary.",
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^```json?/i, "")
      .replace(/```$/, "");
    const concept = JSON.parse(text) as FootageConcept;
    if (!Array.isArray(concept.shotList) || concept.shotList.length === 0) {
      concept.shotList = placeholder(input).shotList;
    }
    return { concept, usedAI: true };
  } catch {
    return { concept: placeholder(input), usedAI: false };
  }
}
