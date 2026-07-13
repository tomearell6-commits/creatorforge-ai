"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action: create a new project for the signed-in user, then drop them
 * into the guided Create Studio (Script → Voiceover → Video → Preview →
 * Publish) rather than the standalone script form.
 */
export async function createProject(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const idea = String(formData.get("idea") || "").trim();

  if (!title || !category) {
    throw new Error("Title and category are required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: user.id, title, category, idea, status: "draft" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/projects");
  redirect(`/dashboard/create-studio/${data.id}`);
}

/** Server Action: delete a project the user owns. */
export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") || "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects");
}
