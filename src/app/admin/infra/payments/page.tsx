import { InfraProviders } from "@/components/admin/InfraProviders";
export default function Page() {
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Payment Providers</h1><InfraProviders category="payment" title="Payment providers" /></div>;
}
