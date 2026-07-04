import { AreaHub } from "@/components/dashboard/AreaHub";

export const metadata = { title: "Grow — CreatorsForge AI" };

export default function GrowPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <AreaHub areaId="grow" />
    </div>
  );
}
