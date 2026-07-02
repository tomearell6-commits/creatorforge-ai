import { DesignTemplateGallery } from "@/components/design/DesignTemplateGallery";

export const metadata = { title: "Design Templates — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Design templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start from a professionally structured template and make it yours.</p>
      </div>
      <DesignTemplateGallery />
    </div>
  );
}
