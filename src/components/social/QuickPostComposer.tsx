"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Send, ExternalLink, Plug } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

const TEXT_CAPABLE = ["linkedin", "facebook", "x"] as const;
const LABELS: Record<string, string> = { linkedin: "LinkedIn", facebook: "Facebook Page", x: "X" };
const X_LIMIT = 280;

type Account = { platform: string; account_name: string; status: string };
type Result = { platform: string; ok: boolean; url: string | null; error: string | null };

/** Compose a short text post and publish it now to connected LinkedIn/Facebook/X. */
export function QuickPostComposer() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/social")
      .then((r) => r.json())
      .then((j) => {
        const usable: Account[] = (j.accounts ?? []).filter(
          (a: Account) => a.status === "connected" && (TEXT_CAPABLE as readonly string[]).includes(a.platform),
        );
        setAccounts(usable);
        setPicked(Object.fromEntries(usable.map((a) => [a.platform, true])));
      })
      .finally(() => setLoading(false));
  }, []);

  const chosen = useMemo(() => Object.keys(picked).filter((k) => picked[k]), [picked]);
  const xPicked = picked["x"];
  const overX = xPicked && text.length > X_LIMIT;

  async function post() {
    setBusy(true); setErr(null); setResults(null);
    try {
      const r = await fetch("/api/social/quick-post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), destinations: chosen, visibility }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "Couldn't post."); return; }
      setResults(j.results ?? []);
    } finally { setBusy(false); }
  }

  if (loading) return <Card className="flex items-center justify-center py-10"><Spinner className="h-5 w-5" /></Card>;

  return (
    <Card className="space-y-4 p-5">
      <div>
        <CardTitle>Quick post</CardTitle>
        <CardDescription>Write once, post now to your connected LinkedIn, Facebook or X — no video needed.</CardDescription>
      </div>

      {accounts.length === 0 ? (
        <Alert variant="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Connect <strong>LinkedIn</strong>, <strong>Facebook</strong> or <strong>X</strong> first to post here.</span>
            <Link href="/dashboard/manage/integrations"><Button size="sm"><Plug className="h-4 w-4" /> Connect accounts</Button></Link>
          </div>
        </Alert>
      ) : (
        <>
          <div>
            <textarea
              aria-label="Post text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="What do you want to share?"
              className="w-full rounded-lg border border-border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{text.length} characters</span>
              {xPicked && <span className={overX ? "font-medium text-red-600" : ""}>X limit {X_LIMIT} — {overX ? `${text.length - X_LIMIT} over (will be truncated)` : `${X_LIMIT - text.length} left`}</span>}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground">Post to</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {accounts.map((a) => (
                <label key={a.platform} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${picked[a.platform] ? "border-brand-600 bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-100" : "border-border"}`}>
                  <input type="checkbox" className="h-4 w-4" checked={!!picked[a.platform]} onChange={(e) => setPicked((p) => ({ ...p, [a.platform]: e.target.checked }))} />
                  <span className="font-medium">{LABELS[a.platform] ?? a.platform}</span>
                  <span className="text-xs text-muted-foreground">{a.account_name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Visibility</span>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as "public" | "private")} className="h-8 rounded-md border border-border bg-background px-2 text-sm">
              <option value="public">Public</option>
              <option value="private">Private / connections only</option>
            </select>
          </div>

          {err && <Alert variant="error">{err}</Alert>}

          {results && (
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.platform} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm">
                  <span className="font-medium">{LABELS[r.platform] ?? r.platform}</span>
                  {r.ok ? (
                    <span className="flex items-center gap-2">
                      <Badge variant="success">posted</Badge>
                      {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">View <ExternalLink className="h-3 w-3" /></a>}
                    </span>
                  ) : (
                    <span className="text-right text-xs text-red-600">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button onClick={post} disabled={busy || !text.trim() || chosen.length === 0}>
            {busy ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />} Post now
          </Button>
        </>
      )}
    </Card>
  );
}
