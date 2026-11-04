import { createAdminClient } from "@/lib/supabase/admin";
import { authenticatePull } from "@/lib/wp-pull/auth";
import { completeDelivery, type DeliveryReport } from "@/lib/wp-pull/queue";
import { readJsonBody } from "@/lib/api/respond";

/** The plugin reports the result for one article: { id, ok, postId?, url?, status?, error? }. */
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const a = await authenticatePull(request, siteId, "wp-pull-report", 60);
  if (!a.ok) return a.res;
  const body = await readJsonBody<{ id?: unknown } & DeliveryReport>(request);
  if (!body || typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || typeof body.ok !== "boolean") {
    return Response.json({ error: "Send { id, ok } as JSON." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const url = typeof body.url === "string" && /^https?:\/\//i.test(body.url) ? body.url : undefined;
  const r = await completeDelivery(createAdminClient(), a.site.id, body.id, {
    ok: body.ok, postId: typeof body.postId === "string" || typeof body.postId === "number" ? body.postId : undefined, url,
    status: typeof body.status === "string" ? body.status.slice(0, 20) : undefined, error: typeof body.error === "string" ? body.error : undefined,
  });
  if (!r.ok) return Response.json({ error: r.error }, { status: r.status, headers: { "Cache-Control": "no-store" } });
  return Response.json({ ok: true, message: r.message }, { headers: { "Cache-Control": "no-store" } });
}
