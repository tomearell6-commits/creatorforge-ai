import { ReportsView } from "@/components/autopilot/ReportsView";
export const metadata = { title: "Autopilot Reports — CreatorsForge AI" };
export default function Page() {
  return <div className="mx-auto max-w-4xl space-y-6"><h1 className="text-2xl font-bold">Reports</h1><ReportsView /></div>;
}
