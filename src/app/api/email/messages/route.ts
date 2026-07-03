import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/**
 * GET /api/email/messages?account=&category=&priority= — the user's synced
 * messages with classifications (owner-scoped via RLS). Also returns the
 * user's accounts so the UI can render the account switcher in one call.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const account = searchParams.get("account");
  const category = searchParams.get("category");
  const priority = searchParams.get("priority");

  const { data: accounts } = await supabase
    .from("email_accounts")
    .select("id, provider, email_address, display_name, permission_mode, status, daily_summary, notify_critical, last_synced_at, last_sync_error")
    .eq("user_id", user.id)
    .neq("status", "disconnected")
    .order("created_at", { ascending: true });

  let query = supabase
    .from("email_messages")
    .select("id, account_id, from_name, from_address, subject, snippet, received_at, is_demo, email_classifications(category, priority, summary, needs_reply, is_sensitive, deadline)")
    .eq("user_id", user.id)
    .order("received_at", { ascending: false })
    .limit(100);
  if (account) query = query.eq("account_id", account);

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);

  let messages = data ?? [];
  const cls = (m: (typeof messages)[number]) => (Array.isArray(m.email_classifications) ? m.email_classifications[0] : m.email_classifications);
  if (category) messages = messages.filter((m) => cls(m)?.category === category);
  if (priority) messages = messages.filter((m) => cls(m)?.priority === priority);

  return NextResponse.json({ accounts: accounts ?? [], messages });
}
