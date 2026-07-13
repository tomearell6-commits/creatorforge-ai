import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { Card } from "@/components/ui/Card";
import { AdminSocialBusinessStats } from "@/components/social-business/AdminSocialBusinessStats";

export const metadata = { title: "Admin — Social Business Studio" };

export default async function AdminSocialBusinessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = isAdminEmail(user?.email);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Business Studio — Admin</h1>
        <p className="mt-1 text-muted-foreground">Usage, campaigns, and failed jobs across the platform.</p>
      </div>
      {admin ? <AdminSocialBusinessStats /> : (
        <Card className="text-center text-muted-foreground">You don&rsquo;t have access to the admin dashboard. (Set <code>ADMIN_EMAILS</code> to enable.)</Card>
      )}
    </div>
  );
}
