import { NextRequest, NextResponse } from "next/server";
import { syncDiscordMember } from "@/lib/db/members";
import { syncDiscordTeamAssignment } from "@/lib/discord-team-sync";

type DiscordMeResponse = {
  connected: boolean;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
};

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const discordMeUrl = new URL("/api/discord/me", request.url);

    const discordResponse = await fetch(discordMeUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    });

    if (!discordResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify Discord session.",
        },
        {
          status: 401,
        },
      );
    }

    const discordData =
      (await discordResponse.json()) as DiscordMeResponse;

    if (!discordData.connected || !discordData.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Discord is not connected.",
        },
        {
          status: 401,
        },
      );
    }

    const member = await syncDiscordMember({
      discordId: discordData.user.id,
      username: discordData.user.username,
      displayName:
        discordData.user.displayName ||
        discordData.user.username,
      avatar: discordData.user.avatar,
    });

    const teamSync = await syncDiscordTeamAssignment(
      discordData.user.id,
    );

    return NextResponse.json(
      {
        success: true,
        member,
        team: teamSync.team,
        teamChanged: teamSync.changed,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Member/team sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to update member and team.",
      },
      {
        status: 500,
      },
    );
  }
}