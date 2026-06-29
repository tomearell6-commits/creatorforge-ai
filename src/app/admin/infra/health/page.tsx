import { InfraProviders } from "@/components/admin/InfraProviders";
export default function Page() {
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Service Health</h1><InfraProviders title="All services — health & latency" emphasis="health" /></div>;
}
