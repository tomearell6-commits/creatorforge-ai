import { IndustrySuitesGrid } from "@/components/design/industries/IndustrySuitesGrid";

export const metadata = { title: "Industry Suites — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Professional Industry Suites</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Industry-specific design workspaces with dedicated categories, templates and guided AI workflows —
          organized so you only see what your industry needs.
        </p>
      </div>
      <IndustrySuitesGrid />
    </div>
  );
}
