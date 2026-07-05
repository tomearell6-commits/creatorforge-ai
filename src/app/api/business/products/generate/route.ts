import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { generateProductPack, buildCompanyContext, willUseRealBusinessAI } from "@/lib/business/ai";
import { BUSINESS_CREDIT_COSTS, BUSINESS_CREDIT_REASONS } from "@/config/businessOps";
import { logBizActivity } from "@/lib/business/reports";

export const maxDuration = 60;

/** Generate the full marketing pack (SEO/copy/captions/FAQ/prompts) for a product. */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "biz-product-pack", 10, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await req.json().catch(() => ({}));
  if (typeof productId !== "string") return NextResponse.json({ error: "productId required" }, { status: 400 });

  const cost = willUseRealBusinessAI() ? BUSINESS_CREDIT_COSTS.productPack : 0;
  if (cost > 0 && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits.", required: cost }, { status: 402 });
  }

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("business_products").select("*").eq("id", productId).eq("user_id", user.id).maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const context = await buildCompanyContext(user.id);
  const { result, usedAI } = await generateProductPack(product, context);

  await admin.from("business_products").update({ pack_json: result, updated_at: new Date().toISOString() }).eq("id", product.id);
  if (usedAI && cost > 0) await deductCredits(cost, BUSINESS_CREDIT_REASONS.productPack);
  await logBizActivity(user.id, "product.pack_generated", product.name, { usedAI });

  return NextResponse.json({ pack: result, usedAI, creditsCharged: usedAI ? cost : 0 });
}
