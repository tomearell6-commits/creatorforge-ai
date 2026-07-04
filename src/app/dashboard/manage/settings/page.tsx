import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/manage/settings -> canonical hub. */
export default function Page() {
  redirect("/dashboard/settings");
}
