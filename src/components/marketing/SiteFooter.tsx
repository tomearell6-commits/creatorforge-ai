import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FOOTER_COLUMNS } from "@/lib/marketing";
import { slugify } from "@/config/contentCategories";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-semibold text-ink dark:text-foreground">{col.heading}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href={`/dashboard/create/${slugify(l)}`} className="text-sm text-muted-foreground hover:text-brand-700">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <Logo />
          <p className="text-center text-sm text-muted-foreground">
            Making content creation faster, easier, and more powerful with AI.
          </p>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CreatorsForge.io</p>
        </div>
      </div>
    </footer>
  );
}
