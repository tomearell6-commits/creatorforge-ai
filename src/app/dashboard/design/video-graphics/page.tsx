import { LiveFootagePromptBuilder } from "@/components/design/LiveFootagePromptBuilder";

export const metadata = { title: "Live AI Footage — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Video & Motion Design</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Design realistic video scene concepts, shot lists and storyboards before you generate footage — then send them to the Video or Ad Studio.
        </p>
      </div>
      <LiveFootagePromptBuilder />
    </div>
  );
}
