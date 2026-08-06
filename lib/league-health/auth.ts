import { NextRequest } from "next/server";
import { getStaffRole } from "@/app/lib/staff";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type LeagueHealthUser = {
  id: string;
  username?: string;
  displayName?: string;
};

function readSavedDiscordUser(
  request: NextRequest,
): LeagueHealthUser | null {
  try {
    const encoded =
      request.cookies.get("new_era_discord_user")?.value;

    if (!encoded) return null;

    const user = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as LeagueHealthUser;

    return user?.id ? user : null;
  } catch {
    return null;
  }
}

export async function getLeagueHealthStaffUser(
  request: NextRequest,
): Promise<LeagueHealthUser | null> {
  const user = readSavedDiscordUser(request);

  if (!user?.id) return null;

  if (getStaffRole(user.id)) {
    return user;
  }

  const result = await supabaseAdmin
    .from("members")
    .select("role, is_staff")
    .eq("discord_id", user.id)
    .maybeSingle();

  if (result.error) {
    console.error(
      "Unable to verify league-health access:",
      result.error,
    );
    return null;
  }

  const role = result.data?.role;

  if (
    result.data?.is_staff ||
    role === "owner" ||
    role === "commissioner" ||
    role === "admin"
  ) {
    return user;
  }

  return null;
}
