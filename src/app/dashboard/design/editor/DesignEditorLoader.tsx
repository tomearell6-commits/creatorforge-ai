"use client";

import { useSearchParams } from "next/navigation";
import { DesignEditor } from "@/components/design/DesignEditor";

/** Reads the ?project= id from the URL and mounts the editor. */
export function DesignEditorLoader() {
  const projectId = useSearchParams().get("project") ?? undefined;
  return <DesignEditor projectId={projectId} />;
}
