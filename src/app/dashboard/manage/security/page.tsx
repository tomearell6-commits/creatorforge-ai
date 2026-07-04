import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/manage/security -> canonical hub. */
export default function Page() {
  redirect("/dashboard/settings");
}
