import { AutopilotPlanner } from "@/components/autopilot/AutopilotPlanner";
export const metadata = { title: "Content Planner — CreatorsForge AI" };
export default function Page() {
  return <div className="mx-auto max-w-5xl space-y-6"><h1 className="text-2xl font-bold">Content Planner</h1><AutopilotPlanner /></div>;
}
