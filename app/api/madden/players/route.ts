import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMaddenPlayers } from "@/lib/madden/player-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const team = request.nextUrl.searchParams.get("team");
    const search = request.nextUrl.searchParams.get("search");
    const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 100);
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : 100;

    const supabase = createServerSupabaseClient();
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .select("id, name, slug")
      .eq("slug", "gold-jacket-cfm")
      .maybeSingle();

    if (leagueError) throw leagueError;

    const players = await getCurrentMaddenPlayers({
      leagueId: league?.id ?? null,
      teamAbbreviation: team,
      search,
      limit,
    });

    const franchisePlayerCount = players.filter(
      (player) => player.hasFranchiseData,
    ).length;

    return NextResponse.json({
      success: true,
      league: league ?? null,
      sourceMode:
        franchisePlayerCount > 0
          ? "ea_franchise_with_baseline_fallback"
          : "maddenratings_baseline",
      counts: {
        returned: players.length,
        franchise: franchisePlayerCount,
        baseline: players.length - franchisePlayerCount,
      },
      players,
    });
  } catch (error) {
    console.error("Madden players API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load Madden player data.",
      },
      { status: 500 },
    );
  }
}
