import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Alert } from "@/components/ui/Alert";

export const metadata = { title: "Log in — CreatorForge AI" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Log in to your CreatorForge account.</p>
      {reset === "success" && (
        <div className="mt-4"><Alert variant="success" title="Password updated">You can now log in with your new password.</Alert></div>
      )}
      <div className="mt-6">
        <Suspense><GoogleButton /></Suspense>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}
