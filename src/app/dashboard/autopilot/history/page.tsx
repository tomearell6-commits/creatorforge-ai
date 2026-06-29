import { HistoryView } from "@/components/autopilot/HistoryView";
export const metadata = { title: "Autopilot History — CreatorForge AI" };
export default function Page() {
  return <div className="mx-auto max-w-4xl space-y-6"><h1 className="text-2xl font-bold">History</h1><HistoryView /></div>;
}
