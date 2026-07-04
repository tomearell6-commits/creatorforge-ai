import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/manage/notifications -> canonical hub. */
export default function Page() {
  redirect("/dashboard/notifications");
}
