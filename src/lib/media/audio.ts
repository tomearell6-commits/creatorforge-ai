/**
 * Tiny dependency-free WAV synthesizer used by the placeholder voice provider.
 * Produces a short sine tone so previews/downloads work end-to-end without any
 * external TTS service. Server-only (uses Buffer).
 */

/** Generate a sine-tone WAV as raw bytes (uploaded to Storage on generate). */
export function makeToneWavBuffer(seconds: number, freq: number): Buffer {
  const sampleRate = 8000;
  const clampedSeconds = Math.min(8, Math.max(0.5, seconds));
  const numSamples = Math.floor(sampleRate * clampedSeconds);
  const buffer = Buffer.alloc(44 + numSamples);

  // RIFF / WAVE header (PCM, 8-bit, mono).
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28); // byte rate
  buffer.writeUInt16LE(1, 32); // block align
  buffer.writeUInt16LE(8, 34); // bits/sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Fade in/out to avoid clicks; keep amplitude gentle.
    const env = Math.min(1, t * 4) * Math.min(1, (clampedSeconds - t) * 4);
    const sample = Math.sin(2 * Math.PI * freq * t) * 40 * env;
    buffer.writeUInt8(128 + Math.round(sample), 44 + i);
  }

  return buffer;
}
