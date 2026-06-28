import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/**
 * Audit log viewer (Phase 7 — Module 10).
 * GET ?action=&q=&format=csv -> search audit logs; CSV export when format=csv.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const sp = new URL(request.url).searchParams;
  const action = sp.get("action");
  const q = sp.get("q")?.trim();
  const format = sp.get("format");

  let query = admin
    .from("audit_logs")
    .select("created_at, actor_email, action, target_type, target_id, ip, metadata")
    .order("created_at", { ascending: false })
    .limit(format === "csv" ? 5000 : 300);
  if (action) query = query.eq("action", action);
  if (q) query = query.ilike("actor_email", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (format === "csv") {
    const header = "created_at,actor_email,action,target_type,target_id,ip";
    const rows = (data ?? []).map((r) =>
      [r.created_at, r.actor_email ?? "", r.action, r.target_type ?? "", r.target_id ?? "", r.ip ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    return new NextResponse([header, ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit_logs_${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ logs: data ?? [] });
}
