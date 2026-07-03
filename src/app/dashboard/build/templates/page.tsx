import { BuildTemplateGallery } from "@/components/build/BuildPanels";

export const metadata = { title: "Build Templates — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Build Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">Proven project briefs - pick one and make it yours.</p>
      </div>
      <BuildTemplateGallery />
    </div>
  );
}
