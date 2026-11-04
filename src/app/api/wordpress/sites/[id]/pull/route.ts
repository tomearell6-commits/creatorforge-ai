import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { apiError } from "@/lib/api/respond";
import { generatePullToken, hashPullToken } from "@/lib/wp-pull/token";

/**
 * Pull delivery for one connected WordPress site (owner only, enforced by row level security).
 *  GET    -> { delivery, connected, lastPullAt, waiting }
 *  POST   -> switch pull delivery on; returns the plugin's secret ONCE (only its hash is stored)
 *  DELETE -> back to the normal "push" delivery; the old secret stops working
 */
async function load(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: apiError("Unauthorized", 401) } as const;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: apiError("Not found.", 404) } as const;
  const { data: wp } = await supabase.from("wordpress_sites").select("id, site_name, site_url, delivery, last_pull_at").eq("id", id).maybeSingle();
  if (!wp) return { error: apiError("Not found.", 404) } as const;
  return { supabase, user, wp } as const;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await load((await params).id);
  if ("error" in r) return r.error;
  const { count } = await r.supabase.from("wp_pull_queue").select("id", { count: "exact", head: true }).eq("wordpress_site_id", r.wp.id).in("status", ["pending", "delivering"]);
  const last = r.wp.last_pull_at ? new Date(r.wp.last_pull_at as string).getTime() : 0;
  return NextResponse.json({
    delivery: r.wp.delivery, lastPullAt: r.wp.last_pull_at ?? null,
    connected: !!last && Date.now() - last < 30 * 60_000, // the plugin asks every few minutes
    waiting: count ?? 0, siteName: r.wp.site_name,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await load((await params).id);
  if ("error" in r) return r.error;
  const rl = await limitRequestAsync(request, "wp-pull-enable", 10, 60_000);
  if (!rl.ok) return apiError("Please wait a moment.", 429);
  const token = generatePullToken();
  const { error } = await r.supabase.from("wordpress_sites").update({ delivery: "pull", pull_token_hash: hashPullToken(token), last_pull_at: null }).eq("id", r.wp.id);
  if (error) return apiError("Could not switch on pull delivery. Please try again.", 500);
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.creatorsforge.io").replace(/\/+$/, "");
  return NextResponse.json({ delivery: "pull", token, siteId: r.wp.id, serverUrl: base, note: "Copy the secret now. It is shown only once." });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await load((await params).id);
  if ("error" in r) return r.error;
  const { error } = await r.supabase.from("wordpress_sites").update({ delivery: "push", pull_token_hash: null }).eq("id", r.wp.id);
  if (error) return apiError("Could not switch back. Please try again.", 500);
  return NextResponse.json({ delivery: "push" });
}
