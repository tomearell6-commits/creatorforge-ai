import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { AdminAnalytics } from "@/components/dashboard/AdminAnalytics";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = isAdminEmail(user?.email);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Analytics</h1>
        <p className="mt-1 text-muted-foreground">Platform-wide usage, revenue, and health.</p>
      </div>
      {admin ? (
        <AdminAnalytics />
      ) : (
        <Card className="text-center text-muted-foreground">
          You don’t have access to the admin dashboard. (Set <code>ADMIN_EMAILS</code> to enable.)
        </Card>
      )}
    </div>
  );
}
