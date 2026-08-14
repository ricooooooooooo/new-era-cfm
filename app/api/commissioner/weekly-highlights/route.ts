import {
  NextRequest,
  NextResponse,
} from "next/server";

import { runWeeklyHighlights } from "@/lib/discord/weekly-highlights";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const configured =
    process.env.MADDEN_SYNC_SECRET ||
    process.env.SNALLABOT_IMPORT_SECRET;

  const auth =
    request.headers.get("authorization");

  return Boolean(
    configured &&
      auth?.startsWith("Bearer ") &&
      auth.slice(7).trim() === configured,
  );
}

export async function GET() {
  return NextResponse.json({
    success: true,
    status: "ready",
    revision:
      "weekly-highlights-v3-graphic-attachment",
  });
}

export async function POST(
  request: NextRequest,
) {
  if (!authorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  try {
    const leagueResult =
      await supabaseAdmin
        .from("leagues")
        .select("id, season, current_week")
        .eq("slug", "new-era-cfm")
        .maybeSingle();

    if (leagueResult.error) {
      throw leagueResult.error;
    }

    if (!leagueResult.data) {
      throw new Error(
        "New Era league not found.",
      );
    }

    const result =
      await runWeeklyHighlights({
        leagueId:
          leagueResult.data.id,
        season: Number(
          leagueResult.data.season ?? 1,
        ),
        currentWeek: Number(
          leagueResult.data.current_week ??
            1,
        ),
      });

    return NextResponse.json({
      success: true,
      revision:
        "weekly-highlights-v3-graphic-attachment",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
