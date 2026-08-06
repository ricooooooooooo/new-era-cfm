import { NextRequest, NextResponse } from "next/server";
import { importCanonicalSchedule } from "@/lib/madden/schedule-sync";
import type { CanonicalScheduleImportInput } from "@/lib/madden/schedule-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function providedSecret(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return (
    request.headers.get("x-madden-sync-secret")?.trim() ||
    request.headers.get("x-snallabot-secret")?.trim() ||
    null
  );
}

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "NEW ERA canonical Madden schedule importer",
    status: "ready",
    liveProviderReady: true,
    acceptedShape: {
      leagueSlug: "new-era-cfm",
      source: "ea_franchise",
      provider: "direct_ea",
      gameVersion: "Madden 27",
      syncType: "schedule",
      season: 1,
      currentWeek: 1,
      games: [
        {
          sourceGameId: "EA-GAME-ID",
          week: 1,
          homeTeam: "NE",
          awayTeam: "NYJ",
          scheduledAt: "2026-08-15T02:00:00.000Z",
          status: "scheduled",
          homeScore: null,
          awayScore: null,
        },
      ],
    },
  });
}

export async function POST(request: NextRequest) {
  const configuredSecret =
    process.env.MADDEN_SYNC_SECRET ||
    process.env.SNALLABOT_IMPORT_SECRET;

  if (!configuredSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "Set MADDEN_SYNC_SECRET or SNALLABOT_IMPORT_SECRET first.",
      },
      { status: 500 },
    );
  }

  if (providedSecret(request) !== configuredSecret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as CanonicalScheduleImportInput;
    const result = await importCanonicalSchedule(body);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Madden schedule import failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Schedule import failed.",
      },
      { status: 400 },
    );
  }
}
