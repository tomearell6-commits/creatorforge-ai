import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Forgot password — CreatorForge AI" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a secure reset link.</p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
    </>
  );
}
