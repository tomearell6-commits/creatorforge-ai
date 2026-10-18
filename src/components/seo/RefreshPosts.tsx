"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Post = {
  id: string; slug: string; title: string; url: string; words: number; ageDays: number | null;
  impressions: number | null; clicks: number | null; position: number | null;
  indexed: boolean | null; indexState: string | null; priority: number; reasons: string[];
  revision: { id: string; status: string; newWords: number } | null;
};
type Preview = {
  id: string; status: string; title: string; slug: string; oldWords: number; newWords: number; newHtml: string;
  oldHeadings: { level: number; text: string }[]; newHeadings: { level: number; text: string }[];
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const said = (j as { error?: string }).error;
    if (said) throw new Error(said);
    throw new Error(res.status === 504 || res.status === 502 ? "That took too long. Please try again." : "Something went wrong. Please try again in a moment.");
  }
  return j as T;
}

function Outline({ title, items }: { title: string; items: { level: number; text: string }[] }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{title}</p>
      <ul className="max-h-48 space-y-0.5 overflow-y-auto text-xs">
        {items.length === 0 ? <li className="text-muted-foreground">No headings</li> : items.map((h, i) => <li key={i} className={h.level === 3 ? "pl-4 text-muted-foreground" : "font-medium"}>{h.text}</li>)}
      </ul>
    </div>
  );
}

/** The CreatorsForge blog only (platform owner): write a fuller version of an older post, compare, approve, undo. */
export function RefreshPosts() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [review, setReview] = useState<Preview | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ posts: Post[] }>("/api/seo/refresh");
      setPosts(r.posts);
    } catch (e) {
      if (e instanceof Error && /forbidden|unauthor/i.test(e.message)) setForbidden(true);
      else setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not load posts." });
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function openReview(revisionId: string) {
    setBusy(`r-${revisionId}`);
    try { setReview(await api<Preview>(`/api/seo/refresh/${revisionId}`)); }
    catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not open it." }); }
    finally { setBusy(null); }
  }

  async function write(postId: string) {
    setBusy(`w-${postId}`); setMsg(null);
    try {
      const r = await api<{ revisionId: string }>("/api/seo/refresh/generate", { method: "POST", body: JSON.stringify({ postId }) });
      await load();
      await openReview(r.revisionId);
      setMsg({ kind: "success", text: "The fuller version is ready for you to read. Nothing is published yet." });
    } catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not write it." }); }
    finally { setBusy(null); }
  }

  async function act(id: string, action: "apply" | "undo" | "discard") {
    if (action === "apply" && !confirm("Publish this fuller version now? The address and headline stay the same, and you can undo it afterwards.")) return;
    if (action === "undo" && !confirm("Put the previous version back?")) return;
    setBusy(`a-${id}`); setMsg(null);
    try {
      const r = await api<{ message: string }>(`/api/seo/refresh/${id}`, { method: "POST", body: JSON.stringify({ action }) });
      setMsg({ kind: "success", text: r.message });
      setReview(null);
      await load();
    } catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not do that." }); }
    finally { setBusy(null); }
  }

  if (forbidden) return null;
  if (!posts) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> Loading posts…</div>;

  const shown = all ? posts : posts.filter((p) => p.priority > 0).slice(0, 12);

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>Refresh older posts</CardTitle>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">Short or underperforming posts first. “Write a fuller version” drafts a longer, better-structured article on the same topic, keeping what is sound. You read it next to the old one and decide. The address, headline, search title and publish date never change, and you can undo.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setAll(!all)}>{all ? "Show only the ones that need it" : `Show all ${posts.length} posts`}</Button>
      </div>

      {msg && <Alert variant={msg.kind === "success" ? "success" : "error"}>{msg.text}</Alert>}

      {shown.length === 0 ? <p className="text-sm text-muted-foreground">No post needs a refresh right now.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="py-2 pr-3">Post</th><th className="pr-3 text-right">Words</th><th className="pr-3">Why</th><th className="pr-3 text-right">Shown</th><th className="pr-3">Google</th><th /></tr></thead>
            <tbody className="divide-y divide-border/60 align-top">
              {shown.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-xs py-2 pr-3"><a href={p.url} target="_blank" rel="noreferrer" className="font-medium underline">{p.title}</a><div className="text-xs text-muted-foreground">{p.ageDays ?? "–"} days old</div></td>
                  <td className="pr-3 text-right">{p.words.toLocaleString()}</td>
                  <td className="pr-3 text-xs text-muted-foreground">{p.reasons.length ? p.reasons.join(" · ") : "Looks healthy"}</td>
                  <td className="pr-3 text-right">{p.impressions === null ? "–" : p.impressions.toLocaleString()}</td>
                  <td className="pr-3">{p.indexed === null ? <span className="text-xs text-muted-foreground">not checked</span> : <Badge variant={p.indexed ? "success" : "warning"}>{p.indexed ? "Indexed" : "Not yet"}</Badge>}{p.indexState && !p.indexed ? <div className="mt-0.5 text-[11px] text-muted-foreground">{p.indexState}</div> : null}</td>
                  <td className="text-right whitespace-nowrap">
                    {p.revision?.status === "draft" ? (
                      <Button size="sm" disabled={busy !== null} onClick={() => openReview(p.revision!.id)}>{busy === `r-${p.revision.id}` ? <Spinner size="sm" /> : `Review new version (${p.revision.newWords.toLocaleString()} words)`}</Button>
                    ) : p.revision?.status === "applied" ? (
                      <span className="flex items-center justify-end gap-2"><Badge variant="success">Refreshed</Badge><Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => act(p.revision!.id, "undo")}>Undo</Button></span>
                    ) : (
                      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => write(p.id)}>{busy === `w-${p.id}` ? <><Spinner size="sm" /> Writing (1–2 min)…</> : "Write a fuller version"}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {review && (
        <div className="space-y-3 rounded-xl border border-brand-600 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><p className="font-semibold">{review.title}</p><p className="text-xs text-muted-foreground">{review.oldWords.toLocaleString()} words now → <strong>{review.newWords.toLocaleString()} words</strong> in the new version. Read it before you decide.</p></div>
            <Button size="sm" variant="ghost" onClick={() => setReview(null)}>Close</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Outline title="Sections now" items={review.oldHeadings} />
            <Outline title="Sections in the new version" items={review.newHeadings} />
          </div>
          <div className="blog-content max-h-[26rem] overflow-y-auto rounded-lg border border-border bg-background p-4" dangerouslySetInnerHTML={{ __html: review.newHtml }} />
          {review.status === "draft" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy !== null} onClick={() => act(review.id, "apply")}>{busy === `a-${review.id}` ? <><Spinner size="sm" /> Publishing…</> : "Publish this version"}</Button>
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => act(review.id, "discard")}>Discard</Button>
            </div>
          ) : <p className="text-xs text-muted-foreground">This version is {review.status}.</p>}
        </div>
      )}
    </Card>
  );
}
