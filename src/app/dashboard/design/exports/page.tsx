import { ExportPanel } from "@/components/design/ExportPanel";

export const metadata = { title: "Design Exports — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every design you have exported. PNG and JPG are free; PDF and video conversions use credits.</p>
      </div>
      <ExportPanel />
    </div>
  );
}
