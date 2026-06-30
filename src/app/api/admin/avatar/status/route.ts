import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAvatarProvider } from "@/lib/avatar";

/** GET ?jobId= — poll the avatar render status. */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
  try {
    return NextResponse.json(await getAvatarProvider().getStatus(jobId));
  } catch (e) {
    return NextResponse.json({ status: "failed", error: e instanceof Error ? e.message : "status error" });
  }
}
