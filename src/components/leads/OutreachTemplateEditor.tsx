"use client";

import { useEffect, useState } from "react";
import { FileText, Lock, Pencil, Trash2 } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { UNSUBSCRIBE_FOOTER } from "@/lib/leads/constants";

type Template = {
  id: string;
  name: string;
  subject: string;
  preview_text?: string;
  body: string;
  cta_label?: string;
  cta_url?: string;
  sender_name?: string;
  signature?: string;
};

const EMPTY: Omit<Template, "id"> = {
  name: "",
  subject: "",
  preview_text: "",
  body: "",
  cta_label: "",
  cta_url: "",
  sender_name: "",
  signature: "",
};

export function OutreachTemplateEditor() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [form, setForm] = useState<Omit<Template, "id"> & { id?: string }>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/leads/templates");
      const d = res.ok ? await res.json() : { templates: [] };
      setTemplates(d.templates ?? []);
    } catch {
      setTemplates([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function edit(t: Template) {
    setForm({ ...t });
    setError(null);
  }

  function reset() {
    setForm(EMPTY);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const editing = Boolean(form.id);
      const res = await fetch("/api/leads/templates", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Could not save template.");
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await fetch("/api/leads/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (form.id === id) reset();
      await load();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <CardTitle>{form.id ? "Edit template" : "New template"}</CardTitle>
          <CardDescription>Draft the email your leads will receive. The unsubscribe footer is added automatically.</CardDescription>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="tpl-name">Template name</Label>
            <Input id="tpl-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Cold intro — pet shops" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tpl-subject">Subject</Label>
              <Input id="tpl-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Quick question about {{business}}" required />
            </div>
            <div>
              <Label htmlFor="tpl-preview">Preview text</Label>
              <Input id="tpl-preview" value={form.preview_text} onChange={(e) => set("preview_text", e.target.value)} placeholder="Shown in the inbox preview line" />
            </div>
          </div>

          <div>
            <Label htmlFor="tpl-body">Email body</Label>
            <Textarea id="tpl-body" rows={8} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Hi {{name}}, …" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tpl-cta-label">CTA label</Label>
              <Input id="tpl-cta-label" value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} placeholder="Book a call" />
            </div>
            <div>
              <Label htmlFor="tpl-cta-url">CTA URL</Label>
              <Input id="tpl-cta-url" type="url" value={form.cta_url} onChange={(e) => set("cta_url", e.target.value)} placeholder="https://…" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tpl-sender">Sender name</Label>
              <Input id="tpl-sender" value={form.sender_name} onChange={(e) => set("sender_name", e.target.value)} placeholder="Alex from CreatorForge" />
            </div>
            <div>
              <Label htmlFor="tpl-sig">Business signature</Label>
              <Input id="tpl-sig" value={form.signature} onChange={(e) => set("signature", e.target.value)} placeholder="CreatorForge AI · Sydney" />
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Lock className="h-3.5 w-3.5" aria-hidden /> Required footer (added automatically, not editable)
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{UNSUBSCRIBE_FOOTER}</p>
          </div>

          {error && <Alert variant="error" title="Save failed">{error}</Alert>}

          <div className="flex items-center gap-3">
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? <><Spinner size="sm" /> Saving…</> : form.id ? "Update template" : "Create template"}
            </Button>
            {form.id && (
              <Button type="button" variant="ghost" onClick={reset}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        <CardTitle className="text-base">Your templates</CardTitle>
        {templates === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" /> Loading templates…
          </div>
        ) : templates.length === 0 ? (
          <EmptyState icon={FileText} title="No templates yet" description="Create your first outreach template above." />
        ) : (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.id}>
                <Card className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{t.subject}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => edit(t)}>
                      <Pencil className="h-4 w-4" aria-hidden /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" aria-hidden />
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
