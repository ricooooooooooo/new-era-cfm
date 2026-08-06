import { NextRequest, NextResponse } from "next/server";
import { syncDiscordLeagueActivity } from "@/lib/league-health/discord-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (secret) {
    return authorization === `Bearer ${secret}`;
  }

  const userAgent =
    request.headers.get("user-agent")?.toLowerCase() ?? "";
  const cronSchedule =
    request.headers.get("x-vercel-cron-schedule");

  return (
    userAgent.includes("vercel-cron/1.0") &&
    Boolean(cronSchedule)
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized cron request.",
      },
      {
        status: 401,
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
    console.error("League-health cron failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "League-health cron failed.",
      },
      {
        status: 500,
      },
    );
  }
}
