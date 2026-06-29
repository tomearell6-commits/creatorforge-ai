import { QueueManager } from "@/components/autopilot/QueueManager";
export const metadata = { title: "Publishing Queue — CreatorForge AI" };
export default function Page() {
  return <div className="mx-auto max-w-5xl space-y-6"><h1 className="text-2xl font-bold">Publishing Queue</h1><QueueManager /></div>;
}
