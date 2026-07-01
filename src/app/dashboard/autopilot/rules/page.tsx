import { RulesManager } from "@/components/autopilot/RulesManager";
export const metadata = { title: "Automation Rules — CreatorsForge AI" };
export default function Page() {
  return <div className="mx-auto max-w-3xl space-y-6"><h1 className="text-2xl font-bold">Automation Rules</h1><RulesManager /></div>;
}
