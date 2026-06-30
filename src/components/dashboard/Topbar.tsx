import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";
import { CreditBadge } from "./CreditBadge";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

/** Dashboard top bar: signed-in user + credit badge + sign-out. */
export async function Topbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let credits = 0;
  let plan = "free";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, plan")
      .eq("user_id", user.id)
      .single();
    credits = profile?.credits ?? 0;
    plan = profile?.plan ?? "free";
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <CreditBadge credits={credits} plan={plan} />
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
