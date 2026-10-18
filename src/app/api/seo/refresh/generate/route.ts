import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { generateRevision } from "@/lib/blog/refresh";

/**
 * POST /api/seo/refresh/generate { postId }
 * Writes a fuller version of one blog post as a DRAFT. Nothing is published. The platform's own blog is
 * first-party content, so it uses no customer credits. Takes a minute or two.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const rl = await limitRequestAsync(request, "blog-refresh", 6, 60 * 60_000);
  if (!rl.ok) return apiError("That is enough rewrites for the hour. Please wait a little.", 429);

  const body = await readJsonBody<{ postId?: string }>(request);
  if (!body || typeof body.postId !== "string") return apiError("Choose a post.", 400);

  const r = await generateRevision(gate.admin, gate.user.id, body.postId);
  if (!r.ok) return apiError(r.error, 502);
  return NextResponse.json({ ok: true, revisionId: r.id });
}
