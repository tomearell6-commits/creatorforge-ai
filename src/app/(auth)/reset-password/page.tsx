import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Reset password — CreatorForge AI" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose a strong password you don&apos;t use anywhere else.</p>
      <div className="mt-6">
        <Suspense><ResetPasswordForm /></Suspense>
      </div>
    </>
  );
}
