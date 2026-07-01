"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, X } from "lucide-react";

/** Persistent bottom prompt bar — quick-start a project from anywhere. */
export function FloatingPromptBar() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function submit() {
    router.push(`/signup?prompt=${encodeURIComponent(prompt)}`);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 shadow-lg backdrop-blur">
        <input
          aria-label="Describe what you want to create"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Describe what you want to create..."
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-foreground focus:outline-none dark:text-foreground"
        />
        <button onClick={submit} aria-label="Generate" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-300 text-brand-900 hover:bg-brand-400">
          <ArrowUp className="h-4 w-4" />
        </button>
        <button onClick={() => setHidden(true)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
