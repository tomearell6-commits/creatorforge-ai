import { AdminDesign } from "@/components/admin/AdminDesign";
import { AdminIndustries } from "@/components/admin/AdminIndustries";

export default function Page() {
  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Design Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Design usage metrics and template catalogue management.</p>
        </div>
        <AdminDesign />
      </div>
      <AdminIndustries />
    </div>
  );
}
