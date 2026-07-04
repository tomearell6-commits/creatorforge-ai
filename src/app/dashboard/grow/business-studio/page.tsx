import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/grow/business-studio -> canonical hub. */
export default function Page() {
  redirect("/dashboard/studio/business");
}
