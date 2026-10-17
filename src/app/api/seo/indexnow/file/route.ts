import { createClient } from "@/lib/supabase/server";

/**
 * Download the IndexNow key file for one of the user's sites. The user uploads this
 * text file to the root folder of their website (so it is served at /<key>.txt) —
 * that is how a site proves ownership to the search engines.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const siteId = new URL(request.url).searchParams.get("siteId");
  if (!siteId) return new Response("Missing siteId", { status: 400 });

  const { data: site } = await supabase.from("wordpress_sites").select("metadata").eq("id", siteId).maybeSingle();
  const key = ((site?.metadata ?? {}) as { indexnow_key?: string }).indexnow_key;
  if (!key || !/^[a-zA-Z0-9-]{8,128}$/.test(key)) return new Response("Create the key first.", { status: 404 });

  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${key}.txt"`,
      "Cache-Control": "no-store",
    },
  });
}
