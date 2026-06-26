import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export const metadata = { title: "Settings — CreatorForge AI" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user?.id ?? "")
    .single();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your profile and account.</p>
      </div>

      <Card>
        <CardTitle>Profile</CardTitle>
        <CardDescription className="mb-4">Update your display name.</CardDescription>
        <SettingsForm
          email={user?.email ?? ""}
          fullName={profile?.full_name ?? (user?.user_metadata?.full_name as string) ?? ""}
        />
      </Card>

      <Card>
        <CardTitle>Account</CardTitle>
        <CardDescription className="mt-1">
          Email: <span className="text-foreground">{user?.email}</span>
        </CardDescription>
        <CardDescription className="mt-1">
          User ID: <span className="font-mono text-xs text-foreground">{user?.id}</span>
        </CardDescription>
      </Card>
    </div>
  );
}
