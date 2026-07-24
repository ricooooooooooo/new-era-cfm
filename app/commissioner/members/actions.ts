"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStaffRole } from "../../lib/staff";

type SavedDiscordUser = {
  id: string;
};

async function requireStaff() {
  const cookieStore = await cookies();
  const encodedUser = cookieStore.get("new_era_discord_user")?.value;

  if (!encodedUser) notFound();

  try {
    const user = JSON.parse(
      Buffer.from(encodedUser, "base64url").toString("utf8"),
    ) as SavedDiscordUser;

    const staffRole = getStaffRole(user.id);

    if (!staffRole) notFound();

    return { user, staffRole };
  } catch {
    notFound();
  }
}

export async function updateMemberTeam(formData: FormData) {
  await requireStaff();

  const memberId = String(formData.get("memberId") ?? "").trim();
  const team = String(formData.get("team") ?? "").trim();

  if (!memberId) {
    throw new Error("Missing member ID.");
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("members")
    .update({
      team: team || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  if (error) {
    console.error("Update member team error:", error);
    throw new Error("Unable to update member team.");
  }

  revalidatePath("/commissioner");
  revalidatePath("/commissioner/members");
}

export async function updateMemberStatus(formData: FormData) {
  const { user, staffRole } = await requireStaff();

  const memberId = String(formData.get("memberId") ?? "").trim();
  const nextStatus = String(formData.get("nextStatus")) === "true";

  if (!memberId) {
    throw new Error("Missing member ID.");
  }

  const supabase = createServerSupabaseClient();

  const { data: target, error: targetError } = await supabase
    .from("members")
    .select("discord_id")
    .eq("id", memberId)
    .single();

  if (targetError || !target) {
    throw new Error("Unable to find that member.");
  }

  if (staffRole !== "owner" && target.discord_id === user.id) {
    throw new Error("Commissioners cannot deactivate themselves.");
  }

  const { error } = await supabase
    .from("members")
    .update({
      is_active: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  if (error) {
    console.error("Update member status error:", error);
    throw new Error("Unable to update member status.");
  }

  revalidatePath("/commissioner");
  revalidatePath("/commissioner/members");
}