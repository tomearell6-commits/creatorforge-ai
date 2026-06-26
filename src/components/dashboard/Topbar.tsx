import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

/** Dashboard top bar: shows the signed-in user + credits + sign-out. */
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
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div className="text-sm text-muted-foreground">
        Plan: <span className="font-medium capitalize text-foreground">{plan}</span>
        <span className="mx-2">·</span>
        Credits: <span className="font-medium text-foreground">{credits}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
