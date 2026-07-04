import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/create/design-studio -> canonical hub. */
export default function Page() {
  redirect("/dashboard/design");
}
