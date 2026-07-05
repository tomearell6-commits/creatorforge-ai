import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { generateDesignImage, willUseRealDesignImages } from "@/lib/design/image";
import { uploadFromUrl } from "@/lib/media/storage";
import { getCreditBalance, deductCredits } from "@/lib/credits";

export const maxDuration = 60;

/**
 * Generate a branded AI thumbnail (1280×720) for a tutorial and store it.
 * Charges the ADMIN's credits (8, FLUX) — users never pay to watch tutorials.
 * Tutorials without a stored thumbnail automatically fall back to the free
 * procedural SVG thumbnail, so this is a premium upgrade, not a requirement.
 */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "admin-tutorial-thumb", 10, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const { tutorialId } = await req.json().catch(() => ({}));
  if (typeof tutorialId !== "string") return NextResponse.json({ error: "tutorialId required" }, { status: 400 });

  const { data: tutorial } = await admin
    .from("tutorials").select("id, title, category, description").eq("id", tutorialId).maybeSingle();
  if (!tutorial) return NextResponse.json({ error: "Tutorial not found." }, { status: 404 });

  const cost = willUseRealDesignImages() ? 8 : 0;
  if (cost > 0 && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits.", required: cost }, { status: 402 });
  }

  const prompt =
    `Professional SaaS tutorial thumbnail, clean white background, bold dark headline text "${tutorial.title}", ` +
    `small lime green (#84cc16) accent shapes and underline, subtle abstract geometric decoration, ` +
    `modern minimal tech branding for "CreatorsForge.io", category "${tutorial.category}", ` +
    `flat design, high contrast, no photograph, no watermark, 16:9 composition`;

  const jobInsert = await admin.from("tutorial_generation_jobs").insert({
    tutorial_id: tutorial.id, kind: "thumbnail", status: "processing",
  }).select("id").single();

  try {
    const image = await generateDesignImage(prompt, { width: 1280, height: 720 });
    // fal URLs are temporary — rehost to our own storage immediately.
    const uploaded = await uploadFromUrl(admin, {
      userId: user.id, type: "image", sourceUrl: image.url, ext: "jpg", contentType: "image/jpeg",
    });

    await admin.from("tutorials").update({ thumbnail_url: uploaded.url, updated_at: new Date().toISOString() }).eq("id", tutorial.id);
    await admin.from("tutorial_assets").insert({ tutorial_id: tutorial.id, kind: "thumbnail", url: uploaded.url, metadata: { model: image.model, usedAI: image.usedAI } });
    if (jobInsert.data) await admin.from("tutorial_generation_jobs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", jobInsert.data.id);

    if (image.usedAI && cost > 0) await deductCredits(cost, "TUTORIAL_THUMBNAIL");
    return NextResponse.json({ ok: true, thumbnailUrl: uploaded.url, usedAI: image.usedAI, creditsCharged: image.usedAI ? cost : 0 });
  } catch (e) {
    if (jobInsert.data) {
      await admin.from("tutorial_generation_jobs").update({
        status: "failed", error: e instanceof Error ? e.message : "unknown", updated_at: new Date().toISOString(),
      }).eq("id", jobInsert.data.id);
    }
    return NextResponse.json({ error: "Thumbnail generation failed. Try again." }, { status: 502 });
  }
}
