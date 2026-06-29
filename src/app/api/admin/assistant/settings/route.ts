import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAssistantConfig, ASSISTANT_DEFAULTS, type AssistantConfig } from "@/lib/assistant/config";
import { logAudit } from "@/lib/audit";

const NUMERIC: (keyof AssistantConfig)[] = ["free_messages", "cost_simple", "cost_workflow", "cost_advanced", "low_credit_threshold"];

/** GET — assistant settings + usage/feedback/top-question stats. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const config = await getAssistantConfig(admin);

  const [{ data: usage }, { count: convCount }, { count: msgCount }, { data: feedback }, { data: questions }] = await Promise.all([
    admin.from("assistant_usage").select("free_messages_used, paid_messages_used, credits_spent"),
    admin.from("assistant_conversations").select("id", { count: "exact", head: true }),
    admin.from("assistant_messages").select("id", { count: "exact", head: true }).eq("role", "user"),
    admin.from("assistant_feedback").select("rating"),
    admin.from("assistant_messages").select("message").eq("role", "user").order("created_at", { ascending: false }).limit(100),
  ]);

  const usageRows = usage ?? [];
  const fb = feedback ?? [];

  // Naive "top questions": most frequent normalized first-6-words of recent questions.
  const counts = new Map<string, number>();
  for (const q of questions ?? []) {
    const key = (q.message as string).toLowerCase().split(/\s+/).slice(0, 6).join(" ");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const topQuestions = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([q, n]) => ({ q, n }));

  return NextResponse.json({
    config,
    stats: {
      conversations: convCount ?? 0,
      userMessages: msgCount ?? 0,
      freeMessages: usageRows.reduce((a, r) => a + (r.free_messages_used ?? 0), 0),
      paidMessages: usageRows.reduce((a, r) => a + (r.paid_messages_used ?? 0), 0),
      creditsSpent: usageRows.reduce((a, r) => a + (r.credits_spent ?? 0), 0),
      feedbackUp: fb.filter((f) => f.rating === "up").length,
      feedbackDown: fb.filter((f) => f.rating === "down").length,
      topQuestions,
    },
  });
}

/** PUT — update assistant settings (admin-only, audited). */
export async function PUT(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const body = (await request.json().catch(() => ({}))) as Partial<AssistantConfig>;
  const next: AssistantConfig = { ...ASSISTANT_DEFAULTS, ...(await getAssistantConfig(admin)) };
  if (typeof body.enabled === "boolean") next.enabled = body.enabled;
  for (const k of NUMERIC) if (typeof body[k] === "number") (next[k] as number) = Math.max(0, body[k] as number);

  const { error } = await admin.from("system_settings").upsert({ key: "assistant", value: next, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "infra.assistant.settings", targetType: "system_settings", metadata: next });
  return NextResponse.json({ ok: true, config: next });
}
