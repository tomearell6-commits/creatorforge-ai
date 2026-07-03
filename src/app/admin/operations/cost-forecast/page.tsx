import { OpsCostForecast } from "@/components/admin/operations/OpsMisc";

export const metadata = { title: "Cost Forecast" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cost Forecast</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monthly spend, forecast and unit economics.</p>
      </div>
      <OpsCostForecast />
    </div>
  );
}
