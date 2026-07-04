import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/create/content-studio -> canonical hub. */
export default function Page() {
  redirect("/dashboard/studio/content");
}
