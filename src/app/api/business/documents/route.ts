import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { generateDocument, buildCompanyContext, willUseRealBusinessAI } from "@/lib/business/ai";
import { nextDocNumber, logBizActivity } from "@/lib/business/reports";
import { DOCUMENT_TYPES, BUSINESS_CREDIT_COSTS, BUSINESS_CREDIT_REASONS, type DocumentTypeId } from "@/config/businessOps";

export const maxDuration = 60;

/** Document Generator: list + generate. Users review before exporting. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: documents } = await admin
    .from("business_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({ documents: documents ?? [] });
}

export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "biz-document", 10, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const docType = body?.docType as DocumentTypeId;
  if (!DOCUMENT_TYPES.some((d) => d.id === docType)) {
    return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  }
  if (typeof body?.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const cost = willUseRealBusinessAI() ? BUSINESS_CREDIT_COSTS.documentGenerate : 0;
  if (cost > 0 && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits.", required: cost }, { status: 402 });
  }

  const items = Array.isArray(body.items)
    ? body.items
        .filter((i: unknown): i is { description: string; qty: number; unitPrice: number } => {
          const x = i as Record<string, unknown>;
          return typeof x?.description === "string" && typeof x?.qty === "number" && typeof x?.unitPrice === "number";
        })
        .slice(0, 30)
    : undefined;

  const context = await buildCompanyContext(user.id);
  const { result, usedAI } = await generateDocument(
    docType,
    {
      title: body.title.slice(0, 200),
      recipient: typeof body.recipient === "string" ? body.recipient.slice(0, 200) : undefined,
      details: String(body.details ?? "").slice(0, 4000),
      items,
    },
    context
  );

  const admin = createAdminClient();
  const docNumber = await nextDocNumber(user.id);
  const { data: created, error } = await admin.from("business_documents").insert({
    user_id: user.id,
    doc_type: docType,
    doc_number: docNumber,
    title: body.title.slice(0, 200),
    recipient: typeof body.recipient === "string" ? body.recipient.slice(0, 200) : null,
    content_json: result,
    used_ai: usedAI,
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Could not save the document." }, { status: 500 });

  if (usedAI && cost > 0) await deductCredits(cost, BUSINESS_CREDIT_REASONS.documentGenerate);
  await logBizActivity(user.id, "document.generated", `${docType} ${docNumber}`, { usedAI });

  return NextResponse.json({ document: created, usedAI, creditsCharged: usedAI ? cost : 0 });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("business_documents").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
