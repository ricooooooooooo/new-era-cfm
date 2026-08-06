import { NextRequest, NextResponse } from "next/server";
import { getLeagueHealthStaffUser } from "@/lib/league-health/auth";
import { syncDiscordLeagueActivity } from "@/lib/league-health/discord-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getLeagueHealthStaffUser(request);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Commissioner access is required.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const result = await syncDiscordLeagueActivity();

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Discord league-health sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Discord league-health sync failed.",
      },
      {
        status: 500,
      },
    );
  }
}
