/** Voice catalog + language/accent options for the Voice Studio. */

export type Voice = {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
};

export const VOICES: Voice[] = [
  { id: "aria", name: "Aria", gender: "female" },
  { id: "atlas", name: "Atlas", gender: "male" },
  { id: "nova", name: "Nova", gender: "female" },
  { id: "orion", name: "Orion", gender: "male" },
  { id: "sage", name: "Sage", gender: "neutral" },
];

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
];

export const ACCENTS = [
  { value: "american", label: "American" },
  { value: "british", label: "British" },
  { value: "australian", label: "Australian" },
  { value: "indian", label: "Indian" },
  { value: "neutral", label: "Neutral" },
];

export const THUMBNAIL_STYLES = [
  { value: "bold", label: "Bold & High-Contrast" },
  { value: "minimal", label: "Minimal" },
  { value: "cinematic", label: "Cinematic" },
  { value: "vibrant", label: "Vibrant" },
  { value: "dark", label: "Dark / Moody" },
];
