import { PublishComposer } from "@/components/dashboard/PublishComposer";

export const metadata = { title: "Publishing Center" };

export default function PublishPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Publishing Center</h1>
        <p className="mt-1 text-muted-foreground">
          Pick a rendered video, choose platforms and metadata, then publish now, schedule, or save a draft.
        </p>
      </div>
      <PublishComposer />
    </div>
  );
}
