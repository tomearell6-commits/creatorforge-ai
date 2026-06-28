import { WhiteLabelSettings } from "@/components/dashboard/WhiteLabelSettings";
export const metadata = { title: "White Label" };
export default function WhiteLabelPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">White Label</h1>
        <p className="mt-1 text-muted-foreground">Customize branding for your workspace — logo, colors, domain, and email.</p>
      </div>
      <WhiteLabelSettings />
    </div>
  );
}
