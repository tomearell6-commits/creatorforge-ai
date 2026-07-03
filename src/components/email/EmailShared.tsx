"use client";

/** Shared Email Assistant UI bits: priority/category badges, account hook. */
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EMAIL_CATEGORIES } from "@/lib/email-assistant/safety";

export type EmailAccount = {
  id: string; provider: string; email_address: string; display_name: string | null;
  permission_mode: string; status: string; daily_summary: boolean; notify_critical: boolean;
  last_synced_at: string | null; last_sync_error: string | null;
};

export type EmailMessage = {
  id: string; account_id: string; from_name: string | null; from_address: string | null;
  subject: string | null; snippet: string | null; received_at: string | null; is_demo: boolean;
  email_classifications: { category: string; priority: string; summary: string | null; needs_reply: boolean; is_sensitive: boolean; deadline: string | null }[] | { category: string; priority: string; summary: string | null; needs_reply: boolean; is_sensitive: boolean; deadline: string | null } | null;
};

export function classificationOf(m: EmailMessage) {
  return Array.isArray(m.email_classifications) ? m.email_classifications[0] ?? null : m.email_classifications;
}

export function EmailPriorityBadge({ priority }: { priority: string | null | undefined }) {
  const v = priority === "critical" ? "danger" : priority === "high" ? "warning" : priority === "medium" ? "info" : "default";
  return <Badge variant={v}>{priority ?? "—"}</Badge>;
}

export function EmailCategoryBadge({ category }: { category: string | null | undefined }) {
  const label = EMAIL_CATEGORIES.find((c) => c.id === category)?.label ?? category ?? "—";
  return <Badge variant={category === "urgent" ? "danger" : category === "sales_lead" ? "brand" : "outline"}>{label}</Badge>;
}

/** Load the user's accounts + messages in one call. */
export function useEmailData(accountFilter?: string) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/email/messages${accountFilter ? `?account=${accountFilter}` : ""}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setAccounts(json.accounts ?? []);
      setMessages(json.messages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [accountFilter]);

  useEffect(() => { void reload(); }, [reload]);
  return { accounts, messages, loading, error, reload };
}
