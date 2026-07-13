"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Copy, Check, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { lbPostTypeLabel, type LbPostType } from "@/config/localBusiness";

type Post = { id: string; post_type: string; topic: string | null; main_text: string; status: string; publish_at: string | null; image_url: string | null; created_at: string };

const STATUS_VARIANT: Record<string, "default" | "info" | "success" | "warning" | "danger"> = {
  draft: "default", awaiting_review: "warning", approved: "info", scheduled: "info",
  publishing: "info", published: "success", failed: "danger", cancelled: "default",
};

/** Shared list used by the Publishing Queue and Content Calendar. */
export function LocalBusinessPosts({ mode }: { mode: "queue" | "calendar" }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/local-business/posts/status").then((r) => r.json()).then((j) => setPosts(j.posts ?? [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function publish(id: string) {
    setBusy(id);
    try { await fetch("/api/local-business/posts/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: id }) }); load(); }
    finally { setBusy(null); }
  }

  const shown = mode === "calendar" ? posts.filter((p) => p.publish_at) : posts;

  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{shown.length} {mode === "calendar" ? "scheduled" : ""} post{shown.length === 1 ? "" : "s"}</p>
        <Button asChild size="sm"><Link href="/dashboard/grow/local-business/posts"><Plus className="h-4 w-4" /> New post</Link></Button>
      </div>
      {shown.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No posts yet. <Link href="/dashboard/grow/local-business/posts" className="text-brand-600 hover:underline">Generate your first post</Link>.</Card>
      ) : (
        shown.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant="default">{lbPostTypeLabel(p.post_type as LbPostType)}</Badge>
              <Badge variant={STATUS_VARIANT[p.status] ?? "default"}>{p.status.replace(/_/g, " ")}</Badge>
              {p.publish_at && <span className="text-xs text-muted-foreground">{new Date(p.publish_at).toLocaleString()}</span>}
              <span className="ml-auto text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm">{p.main_text}</p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(p.main_text); setCopied(p.id); setTimeout(() => setCopied(null), 1500); }}>{copied === p.id ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />} Copy</Button>
              <Button variant="outline" size="sm" onClick={() => publish(p.id)} disabled={busy === p.id}>{busy === p.id ? <Spinner className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />} Publish</Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
