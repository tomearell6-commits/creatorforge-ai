import { LoadingState } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl">
      <LoadingState label="Loading Studio…" />
    </div>
  );
}
