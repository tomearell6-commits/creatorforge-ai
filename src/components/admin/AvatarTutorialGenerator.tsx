"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

/**
 * Generates a talking-avatar tutorial from a script via the configured avatar
 * provider (HeyGen / D-ID), then rehosts it and adds it to the library.
 */
export function AvatarTutorialGenerator({ onCreated }: { onCreated?: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Getting Started");
  const [script, setScript] = useState("");
  const [stage, setStage] = useState<"idle" | "rendering" | "saving">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  async function start() {
    setMsg(null);
    if (!title.trim() || !script.trim()) { setMsg("Title and script are required."); return; }
    setStage("rendering");
    const r = await fetch("/api/admin/avatar/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ script }) });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error || "Could not start render."); setStage("idle"); return; }
    setMsg("Rendering avatar video… this can take a few minutes.");
    poll.current = setInterval(async () => {
      const s = await fetch(`/api/admin/avatar/status?jobId=${encodeURIComponent(d.jobId)}`).then((x) => x.json());
      if (s.status === "completed") {
        if (poll.current) clearInterval(poll.current);
        setStage("saving"); setMsg("Render done — saving to your library…");
        const f = await fetch("/api/admin/avatar/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: s.url, title, category, publish: true }) });
        const fd = await f.json();
        if (!f.ok) { setMsg(fd.error || "Save failed."); setStage("idle"); return; }
        setMsg("✅ Tutorial added to the library."); setStage("idle"); setTitle(""); setScript(""); onCreated?.();
      } else if (s.status === "failed") {
        if (poll.current) clearInterval(poll.current);
        setMsg(s.error || "Render failed."); setStage("idle");
      }
    }, 10000);
  }

  return (
    <section className="space-y-3">
      <CardTitle className="text-base">Generate avatar tutorial (AI presenter)</CardTitle>
      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="How to create your first video" /></div>
          <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
        </div>
        <div><Label>Narration script (the presenter speaks this)</Label><Textarea rows={5} value={script} onChange={(e) => setScript(e.target.value)} placeholder="Paste a lesson from docs/TUTORIAL-SCRIPT.md…" /></div>
        <Button onClick={start} disabled={stage !== "idle"}>{stage === "idle" ? "Generate avatar video" : stage === "rendering" ? "Rendering…" : "Saving…"}</Button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <p className="text-xs text-muted-foreground">
          Requires an avatar provider key (set AVATAR_PROVIDER=heygen + HEYGEN_API_KEY, or =did + DID_API_KEY/DID_PRESENTER_IMAGE_URL). The finished video is rehosted to your storage and added to the library.
        </p>
      </Card>
    </section>
  );
}
