import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/manage/billing -> canonical hub. */
export default function Page() {
  redirect("/dashboard/billing");
}
