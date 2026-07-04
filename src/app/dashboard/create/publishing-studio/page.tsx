import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/create/publishing-studio -> canonical hub. */
export default function Page() {
  redirect("/dashboard/studio/publishing");
}
