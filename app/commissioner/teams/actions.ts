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

    if (!getStaffRole(user.id)) notFound();
  } catch {
    notFound();
  }
}

export async function assignTeamOwner(formData: FormData) {
  await requireStaff();

  const teamId = String(formData.get("teamId") ?? "").trim();
  const memberId = String(formData.get("memberId") ?? "").trim();

  if (!teamId) {
    throw new Error("Missing team ID.");
  }

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  if (memberId) {
    const { error: transferError } = await supabase
      .from("teams")
      .update({
        owner_member_id: null,
        updated_at: now,
      })
      .eq("owner_member_id", memberId)
      .neq("id", teamId);

    if (transferError) {
      console.error("Team transfer error:", transferError);
      throw new Error("Unable to transfer that member from their current team.");
    }
  }

  const { error } = await supabase
    .from("teams")
    .update({
      owner_member_id: memberId || null,
      updated_at: now,
    })
    .eq("id", teamId);

  if (error) {
    console.error("Team assignment error:", error);
    throw new Error("Unable to save that team assignment.");
  }

  revalidatePath("/commissioner");
  revalidatePath("/commissioner/members");
  revalidatePath("/commissioner/teams");
}