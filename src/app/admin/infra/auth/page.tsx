import { InfraProviders } from "@/components/admin/InfraProviders";
export default function Page() {
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Authentication Providers</h1><InfraProviders category="auth" title="Authentication providers" /></div>;
}
