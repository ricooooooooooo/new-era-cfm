"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type WebsiteRole =
  | "owner"
  | "commissioner"
  | "admin"
  | "trade_committee"
  | "media_team"
  | "member";

type SavedDiscordUser = {
  id: string;
};

type StaffMember = {
  id: string;
  discord_id: string;
  role: WebsiteRole;
};

const VALID_ROLES: WebsiteRole[] = [
  "owner",
  "commissioner",
  "admin",
  "trade_committee",
  "media_team",
  "member",
];

const MANAGEMENT_ROLES: WebsiteRole[] = [
  "owner",
  "commissioner",
  "admin",
];

async function requireStaff(): Promise<{
  user: SavedDiscordUser;
  member: StaffMember;
}> {
  const cookieStore = await cookies();
  const encodedUser = cookieStore.get("new_era_discord_user")?.value;

  if (!encodedUser) {
    notFound();
  }

  let user: SavedDiscordUser;

  try {
    user = JSON.parse(
      Buffer.from(encodedUser, "base64url").toString("utf8"),
    ) as SavedDiscordUser;
  } catch {
    notFound();
  }

  if (!user.id) {
    notFound();
  }

  const supabase = createServerSupabaseClient();

  const { data: member, error } = await supabase
    .from("members")
    .select("id, discord_id, role")
    .eq("discord_id", user.id)
    .single();

  if (error || !member) {
    notFound();
  }

  const websiteRole = member.role as WebsiteRole;

  if (!MANAGEMENT_ROLES.includes(websiteRole)) {
    notFound();
  }

  return {
    user,
    member: {
      id: member.id,
      discord_id: member.discord_id,
      role: websiteRole,
    },
  };
}

function revalidateMemberPages() {
  revalidatePath("/");
  revalidatePath("/members");
  revalidatePath("/commissioner");
  revalidatePath("/commissioner/members");
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

  revalidateMemberPages();
}

export async function updateMemberStatus(formData: FormData) {
  const { user, member: actingMember } = await requireStaff();

  const memberId = String(formData.get("memberId") ?? "").trim();
  const nextStatus = String(formData.get("nextStatus")) === "true";

  if (!memberId) {
    throw new Error("Missing member ID.");
  }

  const supabase = createServerSupabaseClient();

  const { data: target, error: targetError } = await supabase
    .from("members")
    .select("discord_id, role")
    .eq("id", memberId)
    .single();

  if (targetError || !target) {
    throw new Error("Unable to find that member.");
  }

  const targetRole = target.role as WebsiteRole;

  if (
    actingMember.role !== "owner" &&
    targetRole === "owner"
  ) {
    throw new Error("Only the owner can change the owner's status.");
  }

  if (
    actingMember.role !== "owner" &&
    target.discord_id === user.id
  ) {
    throw new Error("Staff members cannot deactivate themselves.");
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

  revalidateMemberPages();
}

export async function updateMemberRole(formData: FormData) {
  const { user, member: actingMember } = await requireStaff();

  const memberId = String(formData.get("memberId") ?? "").trim();
  const requestedRole = String(
    formData.get("role") ?? "",
  ).trim() as WebsiteRole;

  if (!memberId) {
    throw new Error("Missing member ID.");
  }

  if (!VALID_ROLES.includes(requestedRole)) {
    throw new Error("Invalid website role.");
  }

  const supabase = createServerSupabaseClient();

  const { data: target, error: targetError } = await supabase
    .from("members")
    .select("id, discord_id, role")
    .eq("id", memberId)
    .single();

  if (targetError || !target) {
    throw new Error("Unable to find that member.");
  }

  const targetRole = target.role as WebsiteRole;

  if (
    actingMember.role !== "owner" &&
    (targetRole === "owner" || requestedRole === "owner")
  ) {
    throw new Error("Only the owner can assign or modify the owner role.");
  }

  if (
    actingMember.role === "admin" &&
    (
      targetRole === "owner" ||
      targetRole === "commissioner" ||
      targetRole === "admin" ||
      requestedRole === "owner" ||
      requestedRole === "commissioner" ||
      requestedRole === "admin"
    )
  ) {
    throw new Error(
      "Admins can only assign Member, Trade Committee, or Media Team roles.",
    );
  }

  if (
    target.discord_id === user.id &&
    requestedRole === "member"
  ) {
    throw new Error(
      "You cannot remove your own website management access.",
    );
  }

  const shouldBeStaff = requestedRole !== "member";

  const { error } = await supabase
    .from("members")
    .update({
      role: requestedRole,
      is_staff: shouldBeStaff,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  if (error) {
    console.error("Update member role error:", error);
    throw new Error("Unable to update member role.");
  }

  revalidateMemberPages();
}