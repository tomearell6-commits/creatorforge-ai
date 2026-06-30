/** Language selector chip — inline Union Jack flag + "EN" (emoji flags don't
 *  render on Windows, so we use an SVG). Presentational for now. */
export function LanguageBadge() {
  return (
    <button
      type="button"
      aria-label="Language: English"
      className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-muted dark:text-foreground"
    >
      <span className="overflow-hidden rounded-[3px] leading-none ring-1 ring-black/10">
        <svg viewBox="0 0 60 30" width="22" height="13" aria-hidden xmlns="http://www.w3.org/2000/svg">
          <clipPath id="uk-s"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
          <clipPath id="uk-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
          <g clipPath="url(#uk-s)">
            <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-t)" stroke="#C8102E" strokeWidth="4" />
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
          </g>
        </svg>
      </span>
      EN
    </button>
  );
}
