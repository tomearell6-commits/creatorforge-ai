import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cacheGet, cacheSet, listProperties, tokenFor, type Connection } from "./google";
import { pickProperty, type GscProperty } from "./overview";

export type Resolved =
  | { state: "ok"; property: string; token: string; email: string }
  | { state: "not_connected" }
  | { state: "no_property"; properties: string[] }
  | { state: "reconnect"; message: string };

const PROPS_TTL = 60 * 60_000; // a property list changes rarely

/** Find which connected Google account has this website in Search Console, and a working token for it. */
export async function resolveProperty(admin: SupabaseClient, userId: string, host: string): Promise<Resolved> {
  const { data: conns } = await admin.from("gsc_connections").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  const list = (conns ?? []) as Connection[];
  if (list.length === 0) return { state: "not_connected" };

  const all: string[] = [];
  let lastError = "";
  for (const c of list) {
    const t = await tokenFor(admin, c);
    if ("error" in t) { lastError = t.error; continue; }

    let props = await cacheGet<GscProperty[]>(admin, userId, "props", c.id, PROPS_TTL);
    if (!props) {
      const r = await listProperties(t.token);
      if (!r.ok) { lastError = r.message; continue; }
      props = r.data.siteEntry ?? [];
      await cacheSet(admin, userId, "props", c.id, props);
    }
    all.push(...props.map((p) => p.siteUrl));
    const match = pickProperty(props, host);
    if (match) return { state: "ok", property: match, token: t.token, email: c.google_email };
  }
  if (all.length === 0 && lastError) return { state: "reconnect", message: lastError };
  return { state: "no_property", properties: all };
}
