"use client";

import { Sparkles } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/** Welcome card on the dashboard home that opens the Forge AI Assistant. */
export function AssistantOnboardingCard() {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50/40">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-300 text-brand-900"><Sparkles className="h-5 w-5" /></span>
        <div>
          <CardTitle className="text-base">Need help getting started?</CardTitle>
          <CardDescription>Forge AI Assistant can guide you through creating your first video, SEO article, product ad, or social post.</CardDescription>
        </div>
      </div>
      <Button variant="accent" onClick={() => window.dispatchEvent(new Event("open-forge-assistant"))}>
        <Sparkles className="h-4 w-4" /> Open Assistant
      </Button>
    </Card>
  );
}
