"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Save, Check, Coins } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { CATEGORIES, TONES, LENGTHS, DEFAULT_TONE, DEFAULT_LENGTH } from "@/lib/constants";

type ProjectOption = { id: string; title: string; category: string; idea: string | null };

export function ScriptGenerator({
  projects,
  initialProjectId,
}: {
  projects: ProjectOption[];
  initialProjectId?: string;
}) {
  const router = useRouter();
  const initial = projects.find((p) => p.id === initialProjectId);

  const [projectId, setProjectId] = useState(initial?.id ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0].slug);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [idea, setIdea] = useState(initial?.idea ?? "");
  const [tone, setTone] = useState<string>(DEFAULT_TONE);
  const [length, setLength] = useState<string>(DEFAULT_LENGTH);

  const [script, setScript] = useState("");
  const [scriptMeta, setScriptMeta] = useState<{ model: string; tokensUsed: number }>({
    model: "",
    tokensUsed: 0,
  });
  const [creditNote, setCreditNote] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  async function generate() {
    setError(null);
    setSaved(false);
    setNeedsUpgrade(false);
    setCreditNote(null);
    if (!idea.trim()) {
      setError("Enter a content idea first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, idea, title, tone, length }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setNeedsUpgrade(true);
        setError(data.error || "Not enough credits.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Generation failed.");

      setScript(data.content);
      setScriptMeta({ model: data.model, tokensUsed: data.tokensUsed });
      if (data.billable) {
        setCreditNote(
          `${data.creditsCharged} credit used · ${data.creditsRemaining ?? "?"} remaining`
        );
        // Refresh server components (topbar credit balance).
        router.refresh();
      } else {
        setCreditNote("Placeholder engine — no credits charged.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setError(null);
    if (!projectId) {
      setError("Select a project to save this script to.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/generate-script", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          content: script,
          model: scriptMeta.model,
          tokensUsed: scriptMeta.tokensUsed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="category">Category</Label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="tone">Tone</Label>
            <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)} className={selectClass}>
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="length">Length</Label>
            <select id="length" value={length} onChange={(e) => setLength(e.target.value)} className={selectClass}>
              {LENGTHS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="idea">Content idea</Label>
          <Textarea
            id="idea"
            rows={3}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe what you want the script to be about…"
          />
        </div>

        <Button onClick={generate} disabled={loading} className="w-full">
          <Sparkles className="h-4 w-4" />
          {loading ? "Generating…" : "Generate script"}
        </Button>
      </Card>

      {error && (
        <div className="text-sm text-red-500">
          {error}
          {needsUpgrade && (
            <>
              {" "}
              <Link href="/dashboard/billing" className="font-medium text-brand-600 underline">
                View plans
              </Link>
            </>
          )}
        </div>
      )}

      {script && (
        <Card className="space-y-4">
          {creditNote && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5" /> {creditNote}
            </p>
          )}
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 font-sans text-sm">
            {script}
          </pre>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <Label htmlFor="project">Save to project</Label>
              <select id="project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectClass}>
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={save} disabled={saving} variant="secondary" className="mt-6">
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved" : saving ? "Saving…" : "Save script"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
