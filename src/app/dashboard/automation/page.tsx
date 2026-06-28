import { AutomationRules } from "@/components/dashboard/AutomationRules";

export const metadata = { title: "Automation" };

export default function AutomationPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Automation</h1>
        <p className="mt-1 text-muted-foreground">
          Create rules that react to events — e.g. notify you when a render completes.
        </p>
      </div>
      <AutomationRules />
    </div>
  );
}
