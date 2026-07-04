import { Suspense } from "react";
import { TwoFactorLoginStep } from "@/components/security/TwoFactorLoginStep";

export const metadata = { title: "Two-step verification — CreatorsForge AI" };

export default function TwoFactorPage() {
  return (
    <Suspense>
      <TwoFactorLoginStep />
    </Suspense>
  );
}
