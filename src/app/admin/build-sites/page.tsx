import { AdminBuildSites } from "@/components/admin/AdminBuildSites";

export const metadata = { title: "Hosted Sites — Admin — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hosted Sites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Websites published by users from Build Studio and served from your infrastructure. Review and take down anything that breaks your terms.
        </p>
      </div>
      <AdminBuildSites />
    </div>
  );
}
