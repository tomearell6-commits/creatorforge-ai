import { BusinessNav } from "@/components/business/BusinessNav";

export const metadata = { title: "AI Business Operations Manager — CreatorsForge AI" };

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Business Operations Manager</h1>
        <p className="mt-1 text-muted-foreground">
          Your AI handles the routine — you approve what matters.
        </p>
      </div>
      <BusinessNav />
      {children}
    </div>
  );
}
