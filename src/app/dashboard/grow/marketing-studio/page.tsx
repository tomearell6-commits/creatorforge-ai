import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/grow/marketing-studio -> canonical hub. */
export default function Page() {
  redirect("/dashboard/studio/marketing");
}
