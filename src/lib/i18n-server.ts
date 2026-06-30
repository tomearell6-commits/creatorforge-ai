/** Server-only locale resolution (reads the `lang` cookie). Keep next/headers
 *  out of i18n.ts so client components can import the dictionaries safely. */
import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./i18n";

export async function getServerLocale(): Promise<Locale> {
  try {
    const c = (await cookies()).get("lang")?.value;
    return isLocale(c) ? c : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}
