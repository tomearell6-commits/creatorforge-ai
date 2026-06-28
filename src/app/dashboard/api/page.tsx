import { ApiKeysManager } from "@/components/dashboard/ApiKeysManager";
export const metadata = { title: "API Center" };
export default function ApiPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Center</h1>
        <p className="mt-1 text-muted-foreground">Generate, rotate, and revoke API keys. Keys are stored hashed — copy the secret at creation.</p>
      </div>
      <ApiKeysManager />
    </div>
  );
}
