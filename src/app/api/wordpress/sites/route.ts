import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyWordPress, normalizeSite } from "@/lib/publishing/providers/wordpress";
import { encryptSecret } from "@/lib/security/secrets";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { getUserPlan, isFreePlan, FREE_LIMITS } from "@/lib/plan";

/**
 * WordPress sites (SEO Studio). GET lists the user's sites (no credentials).
 * POST connects a site: validates via REST, encrypts the application password
 * (never stored raw), and saves it. Test connection happens at connect time.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("wordpress_sites")
    .select("id, site_name, site_url, username, default_category, default_author, connection_status, last_connection_test, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sites: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "wp-connect", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const { siteName, siteUrl, username, appPassword, defaultCategory, defaultAuthor } = await request.json();
  if (!siteUrl || !username || !appPassword) {
    return NextResponse.json({ error: "Site URL, username, and application password are required." }, { status: 400 });
  }
  // Validate URL.
  try { new URL(normalizeSite(siteUrl)); } catch { return NextResponse.json({ error: "Invalid site URL." }, { status: 400 }); }

  // Free Trial: cap connected WordPress sites (updating an existing one is allowed).
  if (isFreePlan(await getUserPlan(supabase))) {
    const norm = normalizeSite(siteUrl);
    const { data: existing } = await supabase.from("wordpress_sites").select("site_url").eq("user_id", user.id);
    const list = existing ?? [];
    if (!list.some((s) => s.site_url === norm) && list.length >= FREE_LIMITS.wordpressSites) {
      return NextResponse.json({ error: `The Free Trial allows ${FREE_LIMITS.wordpressSites} connected WordPress site. Upgrade to connect more.`, code: "upgrade_required" }, { status: 403 });
    }
  }

  const verified = await verifyWordPress({ siteUrl, username, appPassword });
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });

  const { data, error } = await supabase
    .from("wordpress_sites")
    .upsert(
      {
        user_id: user.id,
        site_name: siteName?.trim() || verified.siteName,
        site_url: normalizeSite(siteUrl),
        username,
        encrypted_application_password: encryptSecret(appPassword),
        default_category: defaultCategory ?? null,
        default_author: defaultAuthor ?? null,
        connection_status: "connected",
        last_connection_test: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,site_url" }
    )
    .select("id, site_name, site_url, username, default_category, connection_status, last_connection_test")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ site: data });
}
