import { BuildProjectsList } from "@/components/build/BuildPanels";

export const metadata = { title: "My Build Projects — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Build Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every project plan you have generated.</p>
      </div>
      <BuildProjectsList />
    </div>
  );
}
