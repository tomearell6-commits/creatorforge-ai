"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function SettingsForm({ email, fullName }: { email: string; fullName: string }) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name })
        .eq("user_id", user.id);
      // Keep auth metadata in sync too.
      await supabase.auth.updateUser({ data: { full_name: name } });
      if (error) setError(error.message);
      else {
        setSaved(true);
        router.refresh();
      }
    }
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
      </div>
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={saving}>
        {saved ? "Saved" : saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
