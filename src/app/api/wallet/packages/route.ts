import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CREDIT_PACKAGES } from "@/lib/constants";

/** GET /api/wallet/packages — active credit packages (DB authoritative, constant fallback). */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_packages")
    .select("slug, name, usd_price, credits, bonus, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    // Fallback to the bundled catalogue so the UI always renders.
    return NextResponse.json({
      packages: CREDIT_PACKAGES.map((p) => ({
        slug: p.slug, name: p.name, usdPrice: p.usdPrice, credits: p.credits, bonus: p.bonus, tag: p.tag,
      })),
      source: "fallback",
    });
  }

  return NextResponse.json({
    packages: data.map((p) => ({
      slug: p.slug, name: p.name, usdPrice: Number(p.usd_price), credits: p.credits, bonus: p.bonus,
    })),
    source: "db",
  });
}
