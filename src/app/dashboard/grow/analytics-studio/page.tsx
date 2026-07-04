import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/grow/analytics-studio -> canonical hub. */
export default function Page() {
  redirect("/dashboard/studio/analytics");
}
