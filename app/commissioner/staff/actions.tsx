"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function approveApplication(formData: FormData) {
  const id = formData.get("applicationId")?.toString();

  if (!id) return;

  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("staff_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  revalidatePath("/commissioner/staff");
}

export async function denyApplication(formData: FormData) {
  const id = formData.get("applicationId")?.toString();

  if (!id) return;

  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("staff_applications")
    .update({
      status: "denied",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  revalidatePath("/commissioner/staff");
}