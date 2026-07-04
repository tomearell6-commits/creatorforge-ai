import { AreaHub } from "@/components/dashboard/AreaHub";

export const metadata = { title: "Manage — CreatorsForge AI" };

export default function ManagePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <AreaHub areaId="manage" />
    </div>
  );
}
