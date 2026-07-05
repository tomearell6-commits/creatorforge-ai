import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Product Catalogue CRUD (owner). */
async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: products } = await admin
    .from("business_products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
  return NextResponse.json({ products: products ?? [] });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: created, error } = await admin.from("business_products").insert({
    user_id: user.id,
    name: body.name.slice(0, 200),
    category: typeof body.category === "string" ? body.category.slice(0, 100) : null,
    price: typeof body.price === "number" && body.price >= 0 ? body.price : null,
    currency: typeof body.currency === "string" ? body.currency.slice(0, 8) : "USD",
    sku: typeof body.sku === "string" ? body.sku.slice(0, 60) : null,
    description: typeof body.description === "string" ? body.description.slice(0, 4000) : null,
    specifications: body.specifications && typeof body.specifications === "object" ? body.specifications : {},
    image_url: typeof body.image_url === "string" ? body.image_url.slice(0, 800) : null,
    status: ["draft", "published", "archived"].includes(body.status) ? body.status : "draft",
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Could not create the product." }, { status: 500 });
  return NextResponse.json({ product: created });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of ["name", "category", "sku", "description", "image_url", "video_url", "currency"] as const) {
    if (typeof body[f] === "string") patch[f] = body[f].slice(0, 4000);
  }
  if (typeof body.price === "number" && body.price >= 0) patch.price = body.price;
  if (body.specifications && typeof body.specifications === "object") patch.specifications = body.specifications;
  if (["draft", "published", "archived"].includes(body.status)) patch.status = body.status;

  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("business_products").update(patch).eq("id", body.id).eq("user_id", user.id).select("*").maybeSingle();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product: updated });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("business_products").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
