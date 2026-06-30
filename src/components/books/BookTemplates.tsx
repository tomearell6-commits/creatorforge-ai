"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BOOK_TEMPLATES } from "@/lib/books/templates";

type T = { slug: string; name: string; category: string; description: string };

export function BookTemplates() {
  const router = useRouter();
  const [templates, setTemplates] = useState<T[]>(BOOK_TEMPLATES);
  useEffect(() => { fetch("/api/books/templates").then((r) => r.json()).then((d) => { if (d.templates?.length) setTemplates(d.templates); }); }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <Card key={t.slug} className="flex flex-col gap-2">
          <CardTitle className="text-base">{t.name}</CardTitle>
          <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs">{t.category}</span>
          <p className="text-sm text-muted-foreground">{t.description}</p>
          <Button className="mt-auto" variant="outline" onClick={() => router.push(`/dashboard/books/new?category=${encodeURIComponent(t.category)}`)}>Use this template</Button>
        </Card>
      ))}
    </div>
  );
}
