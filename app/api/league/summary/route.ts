import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type LeagueRow = {
  id: string;
  name: string | null;
  current_week: number | null;
  season: number | null;
};

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const [
      membersResult,
      leaguesResult,
      standingsResult,
      gamesResult,
    ] = await Promise.all([
      supabase
        .from("members")
        .select("discord_id", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("leagues")
        .select("id, name, current_week, season")
        .limit(1)
        .maybeSingle(),

      supabase
        .from("standings")
        .select("team_id", {
          count: "exact",
          head: true,
        })
        .not("member_id", "is", null),

      supabase
        .from("games")
        .select("id", {
          count: "exact",
          head: true,
        })
        .not("status", "eq", "scheduled"),
    ]);

    if (membersResult.error) {
      console.error("League summary members error:", membersResult.error);
    }

    if (leaguesResult.error) {
      console.error("League summary league error:", leaguesResult.error);
    }

    if (standingsResult.error) {
      console.error("League summary standings error:", standingsResult.error);
    }

    if (gamesResult.error) {
      console.error("League summary games error:", gamesResult.error);
    }

    const league = leaguesResult.data as LeagueRow | null;

    const memberCount = membersResult.count ?? 0;
    const claimedTeams = standingsResult.count ?? 0;
    const totalTeams = 32;
    const openTeams = Math.max(totalTeams - claimedTeams, 0);
    const gamesPlayed = gamesResult.count ?? 0;

    return NextResponse.json({
      success: true,
      league: {
        id: league?.id ?? null,
        name: league?.name ?? "NEW ERA CFM",
        currentWeek: league?.current_week ?? null,
        season: league?.season ?? null,
      },
      counts: {
        members: memberCount,
        totalTeams,
        claimedTeams,
        openTeams,
        gamesPlayed,
      },
      syncStatus: league
        ? "connected"
        : "waiting_for_league_setup",
    });
  } catch (error) {
    console.error("League summary route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load league summary.",
      },
      {
        status: 500,
      },
    );
  }
}