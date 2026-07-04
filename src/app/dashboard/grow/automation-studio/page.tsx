import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/grow/automation-studio -> canonical hub. */
export default function Page() {
  redirect("/dashboard/studio/automation");
}
