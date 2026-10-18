import { redirect } from "next/navigation";

// The Auto-Poster now lives inside SEO Autopilot (one simple flow).
export default function SeoAutopostRedirect() {
  redirect("/dashboard/seo/autopilot");
}
