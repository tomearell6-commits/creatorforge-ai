import { BrandKitSelector } from "@/components/design/BrandKitSelector";

export const metadata = { title: "Brand Kit — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Brand Kit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save your logo, colors, fonts and tone once, then apply them to any design in a click.
        </p>
      </div>
      <BrandKitSelector />
    </div>
  );
}
