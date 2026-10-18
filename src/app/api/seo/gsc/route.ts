import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/admin";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { gscConfigured, gscProjectNumber } from "@/lib/gsc/google";
import { listSites } from "@/lib/gsc/sites";

/**
 * SEO Results: what the page needs to start.
 *  GET    -> { configured, connections: [{ id, email, status, error }], sites: [{ host, name, url, kind }] }
 *  DELETE -> { id }  disconnect a Google account (its saved login is deleted)
 * Tokens never leave the server.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const admin = createAdminClient();
  const { data: conns } = await admin.from("gsc_connections").select("id, google_email, status, last_error, created_at").eq("user_id", user.id).order("created_at", { ascending: true });
  const sites = await listSites(supabase, (await isPlatformAdmin()).ok);
  return NextResponse.json({
    configured: gscConfigured(),
    project: gscProjectNumber(),
    connections: (conns ?? []).map((c) => ({ id: c.id, email: c.google_email, status: c.status, error: c.last_error })),
    sites,
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const body = await readJsonBody<{ id?: string }>(request);
  if (!body || typeof body.id !== "string") return apiError("Missing id.", 400);
  const admin = createAdminClient();
  const { error } = await admin.from("gsc_connections").delete().eq("id", body.id).eq("user_id", user.id);
  if (error) return apiError(error.message, 500);
  await admin.from("gsc_cache").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
