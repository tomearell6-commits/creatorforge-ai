import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/manage/credits -> canonical hub. */
export default function Page() {
  redirect("/dashboard/credits");
}
