import { NextRequest, NextResponse } from "next/server";
import { getStaffRole } from "../../../lib/staff";

type SavedDiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

export async function GET(request: NextRequest) {
  const encodedUser = request.cookies.get("new_era_discord_user")?.value;

  if (!encodedUser) {
    return NextResponse.json({
      connected: false,
      user: null,
      isStaff: false,
      staffRole: null,
    });
  }

  try {
    const decodedUser = Buffer.from(encodedUser, "base64url").toString("utf8");
    const user = JSON.parse(decodedUser) as SavedDiscordUser;
    const staffRole = getStaffRole(user.id);

    return NextResponse.json({
      connected: true,
      user,
      isStaff: staffRole !== null,
      staffRole,
    });
  } catch {
    const response = NextResponse.json({
      connected: false,
      user: null,
      isStaff: false,
      staffRole: null,
    });

    response.cookies.delete("new_era_discord_user");

    return response;
  }
}