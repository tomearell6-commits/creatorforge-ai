"use client";

import { usePathname, useRouter } from "next/navigation";
import { Label } from "@/components/ui/Input";

type Option = { id: string; title: string };

/** Reusable project selector — navigates to ?project=<id> on the current page. */
export function ProjectPicker({
  projects,
  selectedId,
}: {
  projects: Option[];
  selectedId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="max-w-sm">
      <Label htmlFor="project-picker">Project</Label>
      <select
        id="project-picker"
        value={selectedId ?? ""}
        onChange={(e) => router.push(`${pathname}?project=${e.target.value}`)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </div>
  );
}
