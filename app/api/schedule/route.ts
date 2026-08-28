import { NextRequest, NextResponse } from "next/server";
import { NFL_TEAMS } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TeamRow = {
  id: string;
  city: string | null;
  name: string;
  abbreviation: string;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedWeek = Number(searchParams.get("week"));
    const requestedSeason = Number(searchParams.get("season"));
    const teamFilter = searchParams.get("team")?.trim() ?? "";

    const leagueResult = await supabaseAdmin
      .from("leagues")
      .select("id, name, slug, season, current_week")
      .eq("slug", "gold-jacket-cfm")
      .maybeSingle();

    if (leagueResult.error) throw leagueResult.error;

    if (!leagueResult.data) {
      return NextResponse.json({
        league: null,
        season: 1,
        currentWeek: 1,
        selectedWeek: 1,
        weeks: [],
        games: [],
        syncStatus: "waiting_for_league",
      });
    }

    const league = leagueResult.data;
    const selectedSeason =
      Number.isInteger(requestedSeason) && requestedSeason > 0
        ? requestedSeason
        : Number(league.season ?? 1);

    const selectedWeek =
      Number.isInteger(requestedWeek) && requestedWeek > 0
        ? requestedWeek
        : Number(league.current_week ?? 1);

    const teamsResult = await supabaseAdmin
      .from("teams")
      .select("id, city, name, abbreviation");

    if (teamsResult.error) throw teamsResult.error;

    const teams = (teamsResult.data ?? []) as TeamRow[];
    const teamMap = new Map(teams.map((team) => [team.id, team]));

    const knownFilter = NFL_TEAMS.find((team) =>
      [
        team.slug,
        team.abbreviation,
        team.name,
        `${team.city} ${team.name}`,
      ]
        .map((value) => value.toLowerCase())
        .includes(teamFilter.toLowerCase()),
    );

    let gamesQuery = supabaseAdmin
      .from("league_games")
      .select("*")
      .eq("league_id", league.id)
      .eq("season", selectedSeason)
      .eq("week", selectedWeek)
      .order("scheduled_at", { ascending: true });

    if (knownFilter) {
      const dbTeam = teams.find(
        (team) =>
          team.abbreviation.toUpperCase() ===
          knownFilter.abbreviation.toUpperCase(),
      );

      if (dbTeam) {
        gamesQuery = gamesQuery.or(
          `home_team_id.eq.${dbTeam.id},away_team_id.eq.${dbTeam.id}`,
        );
      }
    }

    const [gamesResult, weeksResult, marketsResult] = await Promise.all([
      gamesQuery,
      supabaseAdmin
        .from("league_games")
        .select("week")
        .eq("league_id", league.id)
        .eq("season", selectedSeason)
        .order("week", { ascending: true }),
      supabaseAdmin
        .from("prediction_markets")
        .select("game_id, status")
        .eq("league_id", league.id)
        .eq("season", selectedSeason)
        .eq("week", selectedWeek),
    ]);

    if (gamesResult.error) throw gamesResult.error;
    if (weeksResult.error) throw weeksResult.error;
    if (marketsResult.error) throw marketsResult.error;

    const marketsByGame = new Map<string, string[]>();

    for (const market of marketsResult.data ?? []) {
      if (!market.game_id) continue;

      const statuses = marketsByGame.get(market.game_id) ?? [];
      statuses.push(market.status);
      marketsByGame.set(market.game_id, statuses);
    }

    const games = (gamesResult.data ?? []).map((game) => {
      const homeTeam = game.home_team_id
        ? teamMap.get(game.home_team_id)
        : null;
      const awayTeam = game.away_team_id
        ? teamMap.get(game.away_team_id)
        : null;

      const marketStatuses = marketsByGame.get(game.id) ?? [];

      return {
        id: game.id,
        season: game.season,
        week: game.week,
        gameType: game.game_type,
        scheduledAt: game.scheduled_at,
        status: game.status,
        homeScore: game.home_score,
        awayScore: game.away_score,
        isPrimetime: game.is_primetime,
        broadcastLabel: game.broadcast_label,
        source: game.source,
        homeTeam: homeTeam
          ? {
              id: homeTeam.id,
              city: homeTeam.city,
              name: homeTeam.name,
              abbreviation: homeTeam.abbreviation,
            }
          : {
              id: null,
              city: null,
              name: game.home_team_abbreviation ?? "TBD",
              abbreviation: game.home_team_abbreviation ?? "TBD",
            },
        awayTeam: awayTeam
          ? {
              id: awayTeam.id,
              city: awayTeam.city,
              name: awayTeam.name,
              abbreviation: awayTeam.abbreviation,
            }
          : {
              id: null,
              city: null,
              name: game.away_team_abbreviation ?? "TBD",
              abbreviation: game.away_team_abbreviation ?? "TBD",
            },
        marketCount: marketStatuses.length,
        hasOpenMarkets: marketStatuses.includes("open"),
      };
    });

    const weeks = Array.from(
      new Set(
        (weeksResult.data ?? [])
          .map((row) => Number(row.week))
          .filter((week) => Number.isInteger(week) && week > 0),
      ),
    );

    return NextResponse.json({
      league: {
        id: league.id,
        name: league.name ?? "GOLD JACKET CFM",
      },
      season: selectedSeason,
      currentWeek: Number(league.current_week ?? 1),
      selectedWeek,
      weeks,
      games,
      syncStatus:
        games.length > 0 ? "schedule_active" : "waiting_for_schedule_sync",
    });
  } catch (error) {
    console.error("Schedule API failed:", error);

    return NextResponse.json(
      { error: "Unable to load the GOLD JACKET schedule." },
      { status: 500 },
    );
  }
}
