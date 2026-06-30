/**
 * Lightweight i18n. English is the default + fallback; the active locale is read
 * from the `lang` cookie (set by the LanguageSwitcher). Server components call
 * getServerLocale() + getDictionary(). Missing keys fall back to English, so the
 * UI never shows blanks. Curated marketing strings for now — extend per section.
 *
 * Client-safe: no next/headers here (see i18n-server.ts for cookie reading).
 */
export const LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
] as const;
export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";

type Dict = {
  nav: { tools: string; seo: string; tutorials: string; resources: string; pricing: string; affiliate: string; login: string; cta: string };
  hero: { title1: string; title2: string; subtitle: string };
};

const en: Dict = {
  nav: { tools: "Tools", seo: "SEO Studio", tutorials: "Tutorials", resources: "Resources", pricing: "Pricing", affiliate: "Affiliate", login: "Log in", cta: "Start Creating Now" },
  hero: { title1: "Your AI-Powered", title2: "Content Creation Studio", subtitle: "Create faceless videos, product ads, AI shorts, music videos, and social content in minutes." },
};

const DICTS: Record<Locale, Dict> = {
  en,
  es: {
    nav: { tools: "Herramientas", seo: "Estudio SEO", tutorials: "Tutoriales", resources: "Recursos", pricing: "Precios", affiliate: "Afiliados", login: "Iniciar sesión", cta: "Empieza a crear ahora" },
    hero: { title1: "Tu estudio de creación", title2: "de contenido con IA", subtitle: "Crea videos sin rostro, anuncios de producto, shorts con IA, videos musicales y contenido social en minutos." },
  },
  fr: {
    nav: { tools: "Outils", seo: "Studio SEO", tutorials: "Tutoriels", resources: "Ressources", pricing: "Tarifs", affiliate: "Affiliation", login: "Connexion", cta: "Commencer à créer" },
    hero: { title1: "Votre studio de création", title2: "de contenu propulsé par l'IA", subtitle: "Créez des vidéos sans visage, des publicités produit, des shorts IA, des clips musicaux et du contenu social en quelques minutes." },
  },
  de: {
    nav: { tools: "Tools", seo: "SEO-Studio", tutorials: "Tutorials", resources: "Ressourcen", pricing: "Preise", affiliate: "Partnerprogramm", login: "Anmelden", cta: "Jetzt loslegen" },
    hero: { title1: "Dein KI-gestütztes", title2: "Studio für Content-Erstellung", subtitle: "Erstelle Faceless-Videos, Produktanzeigen, KI-Shorts, Musikvideos und Social-Content in Minuten." },
  },
  pt: {
    nav: { tools: "Ferramentas", seo: "Estúdio SEO", tutorials: "Tutoriais", resources: "Recursos", pricing: "Preços", affiliate: "Afiliados", login: "Entrar", cta: "Comece a criar agora" },
    hero: { title1: "Seu estúdio de criação", title2: "de conteúdo com IA", subtitle: "Crie vídeos sem rosto, anúncios de produto, shorts com IA, videoclipes e conteúdo social em minutos." },
  },
};

export function isLocale(v: string | undefined): v is Locale {
  return !!v && LOCALES.some((l) => l.code === v);
}

/** Returns the dictionary for a locale, merged over English so nothing is blank. */
export function getDictionary(locale: Locale): Dict {
  const d = DICTS[locale] ?? en;
  return { nav: { ...en.nav, ...d.nav }, hero: { ...en.hero, ...d.hero } };
}
