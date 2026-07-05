import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentGenerator } from "@/components/business/DocumentGenerator";

export const metadata = { title: "Documents — Business — CreatorsForge AI" };

export default async function BusinessDocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("company_profiles").select("company_name").eq("user_id", user.id).maybeSingle();
  return <DocumentGenerator companyName={profile?.company_name ?? ""} />;
}
