import { DesignStudioDashboard } from "@/components/design/DesignStudioDashboard";

export const metadata = { title: "Design Studio — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Design Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Design professional graphics, ads, thumbnails, covers, and brand assets — with AI and editable layers.
        </p>
      </div>
      <DesignStudioDashboard />
    </div>
  );
}
