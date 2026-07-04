import { redirect } from "next/navigation";

/** Clean-route alias: /dashboard/create/build-studio -> canonical hub. */
export default function Page() {
  redirect("/dashboard/build");
}
