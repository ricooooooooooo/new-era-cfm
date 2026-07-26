import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getStaffRole } from "../../../lib/staff";

type WebsiteRole =
  | "owner"
  | "commissioner"
  | "admin"
  | "trade_committee"
  | "media_team"
  | "member";

type SavedDiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

function isWebsiteRole(value: unknown): value is WebsiteRole {
  return (
    value === "owner" ||
    value === "commissioner" ||
    value === "admin" ||
    value === "trade_committee" ||
    value === "media_team" ||
    value === "member"
  );
}

export async function GET(request: NextRequest) {
  const encodedUser = request.cookies.get("new_era_discord_user")?.value;

  if (!encodedUser) {
    return NextResponse.json({
      connected: false,
      user: null,
      isStaff: false,
      staffRole: null,
      role: "member",
      roles: ["member"],
    });
  }

  try {
    const decodedUser = Buffer.from(encodedUser, "base64url").toString("utf8");
    const user = JSON.parse(decodedUser) as SavedDiscordUser;

    const environmentRole = getStaffRole(user.id);

    const { data: member, error } = await supabaseAdmin
      .from("members")
      .select("role")
      .eq("discord_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load website role:", error);
    }

    const databaseRole = isWebsiteRole(member?.role) ? member.role : null;

    // Keep environment-configured owners/commissioners protected.
    // Otherwise use the role assigned in the members table.
    const role: WebsiteRole =
      environmentRole === "owner"
        ? "owner"
        : environmentRole === "commissioner"
          ? "commissioner"
          : databaseRole ?? "member";

    const staffRole =
      role === "owner" || role === "commissioner" ? role : null;

    return NextResponse.json({
      connected: true,
      user,
      isStaff: role !== "member",
      staffRole,
      role,
      roles: [role],
    });
  } catch (error) {
    console.error("Failed to read Discord session:", error);

    const response = NextResponse.json({
      connected: false,
      user: null,
      isStaff: false,
      staffRole: null,
      role: "member",
      roles: ["member"],
    });

    response.cookies.delete("new_era_discord_user");

    return response;
  }
}