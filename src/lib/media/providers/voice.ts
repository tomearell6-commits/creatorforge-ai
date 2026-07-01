import type { VoiceProvider, VoiceSynthesisInput } from "../types";
import { makeToneWavBuffer } from "../audio";
import { fetchWithTimeout } from "@/lib/http";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function estimateSeconds(text: string, speed: number): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 2.5 / (speed || 1)));
}

/**
 * Placeholder voice provider — synthesizes a short sine-tone WAV so the studio
 * works with no API key. Pitch/speed shift the tone audibly.
 */
const placeholderVoiceProvider: VoiceProvider = {
  id: "placeholder",
  name: "CreatorsForge Placeholder Voice",
  async synthesize(input: VoiceSynthesisInput) {
    const fullSeconds = estimateSeconds(input.text, input.speed);
    const seconds = input.preview ? 2 : Math.min(8, fullSeconds);
    const baseFreq = 160 + (hash(input.voiceId ?? "default") % 160);
    const freq = baseFreq * (input.pitch || 1);
    return {
      data: makeToneWavBuffer(seconds, freq),
      contentType: "audio/wav",
      durationSeconds: input.preview ? fullSeconds : seconds,
      provider: "placeholder",
    };
  },
};

// Map the studio's catalog voices to ElevenLabs premade voice IDs (shared
// across all accounts). ELEVENLABS_VOICE_ID overrides the fallback.
const ELEVEN_VOICE_MAP: Record<string, string> = {
  aria: "9BWtsMINqrJLrRacOk9x", // Aria
  nova: "EXAVITQu4vr4xnSDxMaL", // Sarah
  atlas: "JBFqnCBsd6RMkjVDRZzb", // George
  orion: "nPczCjzI2devNBz1zQrb", // Brian
  sage: "SAz9YHcvj6GT2YYXdXww", // River
};

/**
 * ElevenLabs voice provider. Activated by VOICE_PROVIDER=elevenlabs +
 * ELEVENLABS_API_KEY. Returns MP3 bytes. (ElevenLabs has no pitch control, so
 * `pitch` is ignored; `speed` maps to voice_settings.speed, clamped 0.7–1.2.)
 */
const elevenLabsVoiceProvider: VoiceProvider = {
  id: "elevenlabs",
  name: "ElevenLabs",
  async synthesize(input: VoiceSynthesisInput) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

    const voiceId =
      ELEVEN_VOICE_MAP[input.voiceId ?? ""] ||
      process.env.ELEVENLABS_VOICE_ID ||
      "JBFqnCBsd6RMkjVDRZzb";
    const speed = Math.min(1.2, Math.max(0.7, input.speed || 1));

    const res = await fetchWithTimeout(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speed },
        }),
      },
      30_000
    );
    if (!res.ok) {
      throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
    }
    return {
      data: new Uint8Array(await res.arrayBuffer()),
      contentType: "audio/mpeg",
      durationSeconds: estimateSeconds(input.text, input.speed),
      provider: "elevenlabs",
    };
  },
};

/** Resolve the active voice provider from VOICE_PROVIDER (default: placeholder). */
export function getVoiceProvider(): VoiceProvider {
  switch (process.env.VOICE_PROVIDER) {
    case "elevenlabs":
      return elevenLabsVoiceProvider;
    default:
      return placeholderVoiceProvider;
  }
}
