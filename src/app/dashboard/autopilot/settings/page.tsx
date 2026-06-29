import { AutopilotSettings } from "@/components/autopilot/AutopilotSettings";
export const metadata = { title: "Autopilot Settings — CreatorForge AI" };
export default function Page() {
  return <div className="mx-auto max-w-3xl space-y-6"><h1 className="text-2xl font-bold">Autopilot Settings</h1><AutopilotSettings /></div>;
}
