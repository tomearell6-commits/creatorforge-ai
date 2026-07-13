import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { Card } from "@/components/ui/Card";
import { AdminLocalBusinessStats } from "@/components/local-business/AdminLocalBusinessStats";

export const metadata = { title: "Admin — Local Business Studio" };

export default async function AdminLocalBusinessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = isAdminEmail(user?.email);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Local Business Studio — Admin</h1>
        <p className="mt-1 text-muted-foreground">Usage, provider health, and failed jobs across the platform.</p>
      </div>
      {admin ? <AdminLocalBusinessStats /> : (
        <Card className="text-center text-muted-foreground">You don&rsquo;t have access to the admin dashboard. (Set <code>ADMIN_EMAILS</code> to enable.)</Card>
      )}
    </div>
  );
}
