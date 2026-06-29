"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { HERO_MODELS } from "@/lib/marketing";
import { ModelSelector } from "./ModelSelector";

/** Floating prompt box — sends the idea to signup to start a project. */
export function HeroPromptBox({ placeholder = "Describe what you want to create..." }: { placeholder?: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>(HERO_MODELS[0]);

  function submit() {
    const q = new URLSearchParams({ prompt, model }).toString();
    router.push(`/signup?${q}`);
  }

  return (
    <div className="rounded-3xl border border-brand-300/70 bg-card p-4 shadow-[0_8px_40px_-12px_rgba(132,204,22,0.4)]">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        rows={2}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent text-base text-ink placeholder:text-muted-foreground focus:outline-none dark:text-foreground"
      />
      <div className="mt-2 flex items-center justify-between">
        <ModelSelector value={model} onChange={setModel} />
        <button
          onClick={submit}
          aria-label="Generate"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-300 text-brand-900 transition-colors hover:bg-brand-400"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
