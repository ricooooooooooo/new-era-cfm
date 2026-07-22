import { NextRequest, NextResponse } from "next/server";

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
    });
  }

  try {
    const decodedUser = Buffer.from(encodedUser, "base64url").toString("utf8");
    const user = JSON.parse(decodedUser) as SavedDiscordUser;

    return NextResponse.json({
      connected: true,
      user,
    });
  } catch {
    const response = NextResponse.json({
      connected: false,
      user: null,
    });

    response.cookies.delete("new_era_discord_user");

    return response;
  }
}