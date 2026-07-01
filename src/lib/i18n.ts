/**
 * Lightweight i18n. English is the default + fallback; the active locale is read
 * from the `lang` cookie (set by the LanguageSwitcher). Server components call
 * getServerLocale() (i18n-server.ts) + getDictionary(). Missing keys fall back to
 * English, so the UI never shows blanks.
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
  sections: {
    workflowEyebrow: string; workflowTitle: string; workflowSubtitle: string;
    templatesTitle: string; templatesSubtitle: string;
    pricingTitle: string; pricingSubtitle: string;
    demoEyebrow: string; demoTitle: string; demoSubtitle: string; demoCta: string;
    testimonialsEyebrow: string; testimonialsTitle: string; testimonialsSubtitle: string;
    faqTitle: string; faqSupportPre: string; faqSupportLink: string;
    ctaTitle: string; ctaSubtitle: string; ctaButton: string;
  };
};

const en: Dict = {
  nav: { tools: "Tools", seo: "SEO Studio", tutorials: "Tutorials", resources: "Resources", pricing: "Pricing", affiliate: "Affiliate", login: "Log in", cta: "Start Creating Now" },
  hero: { title1: "Your AI-Powered", title2: "Content Creation Studio", subtitle: "Create faceless videos, product ads, AI shorts, music videos, and social content in minutes." },
  sections: {
    workflowEyebrow: "Your workflow", workflowTitle: "From Solo Creators to Growing Brands", workflowSubtitle: "CreatorsForge helps creators and businesses produce content faster, test more ideas, and publish consistently.",
    templatesTitle: "Templates for every format", templatesSubtitle: "Start from a proven format and recreate it with your own idea in one click.",
    pricingTitle: "Pick Your Plan", pricingSubtitle: "Scale your content creation with higher limits, premium AI models, and faster rendering.",
    demoEyebrow: "See it in action", demoTitle: "From idea to published video — in minutes", demoSubtitle: "Watch how CreatorsForge turns a single prompt into a finished, publish-ready video.", demoCta: "Try it free →",
    testimonialsEyebrow: "Testimonials", testimonialsTitle: "Loved by creators worldwide", testimonialsSubtitle: "Join thousands of creators, marketers, and entrepreneurs who trust CreatorsForge for their content.",
    faqTitle: "Frequently Asked Questions", faqSupportPre: "Can't find the answer you're looking for? Reach out to our ", faqSupportLink: "customer support",
    ctaTitle: "Start creating with CreatorsForge today", ctaSubtitle: "Your first project is free — no credit card required.", ctaButton: "Start Creating Now",
  },
};

const DICTS: Record<Locale, Dict> = {
  en,
  es: {
    nav: { tools: "Herramientas", seo: "Estudio SEO", tutorials: "Tutoriales", resources: "Recursos", pricing: "Precios", affiliate: "Afiliados", login: "Iniciar sesión", cta: "Empieza a crear ahora" },
    hero: { title1: "Tu estudio de creación", title2: "de contenido con IA", subtitle: "Crea videos sin rostro, anuncios de producto, shorts con IA, videos musicales y contenido social en minutos." },
    sections: {
      workflowEyebrow: "Tu flujo de trabajo", workflowTitle: "De creadores individuales a marcas en crecimiento", workflowSubtitle: "CreatorsForge ayuda a creadores y empresas a producir contenido más rápido, probar más ideas y publicar de forma constante.",
      templatesTitle: "Plantillas para cada formato", templatesSubtitle: "Empieza con un formato probado y recréalo con tu propia idea en un clic.",
      pricingTitle: "Elige tu plan", pricingSubtitle: "Escala tu creación de contenido con límites más altos, modelos de IA premium y renderizado más rápido.",
      demoEyebrow: "Míralo en acción", demoTitle: "De la idea al video publicado, en minutos", demoSubtitle: "Mira cómo CreatorsForge convierte una simple indicación en un video listo para publicar.", demoCta: "Pruébalo gratis →",
      testimonialsEyebrow: "Testimonios", testimonialsTitle: "Adorado por creadores de todo el mundo", testimonialsSubtitle: "Únete a miles de creadores, especialistas en marketing y emprendedores que confían en CreatorsForge para su contenido.",
      faqTitle: "Preguntas frecuentes", faqSupportPre: "¿No encuentras la respuesta que buscas? Contacta con nuestro ", faqSupportLink: "equipo de soporte",
      ctaTitle: "Empieza a crear con CreatorsForge hoy", ctaSubtitle: "Tu primer proyecto es gratis, sin tarjeta de crédito.", ctaButton: "Empieza a crear ahora",
    },
  },
  fr: {
    nav: { tools: "Outils", seo: "Studio SEO", tutorials: "Tutoriels", resources: "Ressources", pricing: "Tarifs", affiliate: "Affiliation", login: "Connexion", cta: "Commencer à créer" },
    hero: { title1: "Votre studio de création", title2: "de contenu propulsé par l'IA", subtitle: "Créez des vidéos sans visage, des publicités produit, des shorts IA, des clips musicaux et du contenu social en quelques minutes." },
    sections: {
      workflowEyebrow: "Votre flux de travail", workflowTitle: "Des créateurs solos aux marques en croissance", workflowSubtitle: "CreatorsForge aide les créateurs et les entreprises à produire du contenu plus vite, tester plus d'idées et publier régulièrement.",
      templatesTitle: "Des modèles pour chaque format", templatesSubtitle: "Partez d'un format éprouvé et recréez-le avec votre propre idée en un clic.",
      pricingTitle: "Choisissez votre forfait", pricingSubtitle: "Développez votre création de contenu avec des limites plus élevées, des modèles d'IA premium et un rendu plus rapide.",
      demoEyebrow: "Voir en action", demoTitle: "De l'idée à la vidéo publiée, en quelques minutes", demoSubtitle: "Découvrez comment CreatorsForge transforme une simple consigne en une vidéo prête à publier.", demoCta: "Essayer gratuitement →",
      testimonialsEyebrow: "Témoignages", testimonialsTitle: "Adopté par des créateurs du monde entier", testimonialsSubtitle: "Rejoignez des milliers de créateurs, marketeurs et entrepreneurs qui font confiance à CreatorsForge pour leur contenu.",
      faqTitle: "Questions fréquentes", faqSupportPre: "Vous ne trouvez pas la réponse ? Contactez notre ", faqSupportLink: "support client",
      ctaTitle: "Commencez à créer avec CreatorsForge dès aujourd'hui", ctaSubtitle: "Votre premier projet est gratuit, sans carte bancaire.", ctaButton: "Commencer à créer",
    },
  },
  de: {
    nav: { tools: "Tools", seo: "SEO-Studio", tutorials: "Tutorials", resources: "Ressourcen", pricing: "Preise", affiliate: "Partnerprogramm", login: "Anmelden", cta: "Jetzt loslegen" },
    hero: { title1: "Dein KI-gestütztes", title2: "Studio für Content-Erstellung", subtitle: "Erstelle Faceless-Videos, Produktanzeigen, KI-Shorts, Musikvideos und Social-Content in Minuten." },
    sections: {
      workflowEyebrow: "Dein Workflow", workflowTitle: "Von Solo-Creators zu wachsenden Marken", workflowSubtitle: "CreatorsForge hilft Creators und Unternehmen, schneller Inhalte zu produzieren, mehr Ideen zu testen und konstant zu veröffentlichen.",
      templatesTitle: "Vorlagen für jedes Format", templatesSubtitle: "Starte mit einem bewährten Format und gestalte es mit deiner eigenen Idee in einem Klick neu.",
      pricingTitle: "Wähle deinen Plan", pricingSubtitle: "Skaliere deine Content-Erstellung mit höheren Limits, Premium-KI-Modellen und schnellerem Rendering.",
      demoEyebrow: "In Aktion sehen", demoTitle: "Von der Idee zum veröffentlichten Video – in Minuten", demoSubtitle: "Sieh, wie CreatorsForge aus einer einzigen Eingabe ein fertiges, veröffentlichungsreifes Video macht.", demoCta: "Kostenlos testen →",
      testimonialsEyebrow: "Erfahrungsberichte", testimonialsTitle: "Beliebt bei Creators weltweit", testimonialsSubtitle: "Schließe dich Tausenden von Creators, Marketern und Unternehmern an, die CreatorsForge für ihre Inhalte vertrauen.",
      faqTitle: "Häufige Fragen", faqSupportPre: "Nicht die passende Antwort gefunden? Wende dich an unseren ", faqSupportLink: "Kundensupport",
      ctaTitle: "Starte noch heute mit CreatorsForge", ctaSubtitle: "Dein erstes Projekt ist kostenlos – keine Kreditkarte nötig.", ctaButton: "Jetzt loslegen",
    },
  },
  pt: {
    nav: { tools: "Ferramentas", seo: "Estúdio SEO", tutorials: "Tutoriais", resources: "Recursos", pricing: "Preços", affiliate: "Afiliados", login: "Entrar", cta: "Comece a criar agora" },
    hero: { title1: "Seu estúdio de criação", title2: "de conteúdo com IA", subtitle: "Crie vídeos sem rosto, anúncios de produto, shorts com IA, videoclipes e conteúdo social em minutos." },
    sections: {
      workflowEyebrow: "Seu fluxo de trabalho", workflowTitle: "De criadores individuais a marcas em crescimento", workflowSubtitle: "O CreatorsForge ajuda criadores e empresas a produzir conteúdo mais rápido, testar mais ideias e publicar com consistência.",
      templatesTitle: "Modelos para todos os formatos", templatesSubtitle: "Comece com um formato comprovado e recrie-o com a sua própria ideia em um clique.",
      pricingTitle: "Escolha o seu plano", pricingSubtitle: "Escale sua criação de conteúdo com limites maiores, modelos de IA premium e renderização mais rápida.",
      demoEyebrow: "Veja em ação", demoTitle: "Da ideia ao vídeo publicado, em minutos", demoSubtitle: "Veja como o CreatorsForge transforma um único comando em um vídeo pronto para publicar.", demoCta: "Experimente grátis →",
      testimonialsEyebrow: "Depoimentos", testimonialsTitle: "Amado por criadores no mundo todo", testimonialsSubtitle: "Junte-se a milhares de criadores, profissionais de marketing e empreendedores que confiam no CreatorsForge para o seu conteúdo.",
      faqTitle: "Perguntas frequentes", faqSupportPre: "Não encontrou a resposta que procura? Fale com o nosso ", faqSupportLink: "suporte ao cliente",
      ctaTitle: "Comece a criar com o CreatorsForge hoje", ctaSubtitle: "Seu primeiro projeto é grátis — sem cartão de crédito.", ctaButton: "Comece a criar agora",
    },
  },
};

export function isLocale(v: string | undefined): v is Locale {
  return !!v && LOCALES.some((l) => l.code === v);
}

/** Returns the dictionary for a locale, merged over English so nothing is blank. */
export function getDictionary(locale: Locale): Dict {
  const d = DICTS[locale] ?? en;
  return { nav: { ...en.nav, ...d.nav }, hero: { ...en.hero, ...d.hero }, sections: { ...en.sections, ...d.sections } };
}
