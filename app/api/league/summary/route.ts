import { NextResponse } from "next/server";

import { NFL_TEAMS } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MemberRow = {
  discord_id: string;
  discord_username: string | null;
  display_name: string | null;
  team: string | null;
  is_active: boolean | null;
};

function resolveNFLTeam(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;

  return (
    NFL_TEAMS.find((team) =>
      [
        team.slug,
        team.abbreviation,
        team.name,
        `${team.city} ${team.name}`,
        ...team.aliases,
      ]
        .map((entry) => entry.toLowerCase())
        .includes(normalized),
    ) ?? null
  );
}

export async function GET() {
  try {
    const leagueResult = await supabaseAdmin
      .from("leagues")
      .select(
        "id, name, slug, current_week, season, madden_sync_status, madden_provider",
      )
      .eq("slug", "gold-jacket-cfm")
      .maybeSingle();

    if (leagueResult.error) throw leagueResult.error;

    const league = leagueResult.data;
    const season = Number(league?.season ?? 1);

    const [
      membersResult,
      dbTeamsResult,
      gamesResult,
      snapshotsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("members")
        .select(
          "discord_id, discord_username, display_name, team, is_active",
        ),

      supabaseAdmin
        .from("teams")
        .select("id, abbreviation"),

      league
        ? supabaseAdmin
            .from("league_games")
            .select(
              "home_team_id, away_team_id, home_score, away_score, status",
            )
            .eq("league_id", league.id)
            .eq("season", season)
            .eq("status", "final")
        : Promise.resolve({ data: [], error: null }),

      league
        ? supabaseAdmin
            .from("madden_team_snapshots")
            .select("team_id, overall, captured_at")
            .eq("league_id", league.id)
            .eq("game_version", "Madden 27")
            .order("captured_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (membersResult.error) throw membersResult.error;
    if (dbTeamsResult.error) throw dbTeamsResult.error;
    if (gamesResult.error) throw gamesResult.error;
    if (snapshotsResult.error) throw snapshotsResult.error;

    const members = (membersResult.data ?? []) as MemberRow[];

    const ownerBySlug = new Map<string, MemberRow>();

    for (const member of members) {
      if (member.is_active === false) continue;

      const team = resolveNFLTeam(member.team);
      if (!team) continue;

      if (!ownerBySlug.has(team.slug)) {
        ownerBySlug.set(team.slug, member);
      }
    }

    const dbTeamByAbbreviation = new Map(
      (dbTeamsResult.data ?? []).map((team) => [
        String(team.abbreviation).toUpperCase(),
        team,
      ]),
    );

    const recordByTeamId = new Map<
      string,
      {
        wins: number;
        losses: number;
        ties: number;
        pointsFor: number;
        pointsAgainst: number;
      }
    >();

    for (const team of dbTeamsResult.data ?? []) {
      recordByTeamId.set(String(team.id), {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
    }

    for (const game of gamesResult.data ?? []) {
      if (
        !game.home_team_id ||
        !game.away_team_id ||
        game.home_score === null ||
        game.away_score === null
      ) {
        continue;
      }

      const home = recordByTeamId.get(String(game.home_team_id));
      const away = recordByTeamId.get(String(game.away_team_id));

      if (!home || !away) continue;

      const homeScore = Number(game.home_score);
      const awayScore = Number(game.away_score);

      home.pointsFor += homeScore;
      home.pointsAgainst += awayScore;

      away.pointsFor += awayScore;
      away.pointsAgainst += homeScore;

      if (homeScore > awayScore) {
        home.wins += 1;
        away.losses += 1;
      } else if (awayScore > homeScore) {
        away.wins += 1;
        home.losses += 1;
      } else {
        home.ties += 1;
        away.ties += 1;
      }
    }

    const overallByTeamId = new Map<string, number>();

    for (const snapshot of snapshotsResult.data ?? []) {
      const id = String(snapshot.team_id);

      if (
        !overallByTeamId.has(id) &&
        snapshot.overall !== null &&
        snapshot.overall !== undefined
      ) {
        overallByTeamId.set(id, Number(snapshot.overall));
      }
    }

    const liveLeague =
      league?.madden_sync_status === "live_sync_active";

    const teams = NFL_TEAMS.map((team) => {
      const dbTeam = dbTeamByAbbreviation.get(
        team.abbreviation.toUpperCase(),
      );

      const record = dbTeam
        ? recordByTeamId.get(String(dbTeam.id))
        : undefined;

      const owner = ownerBySlug.get(team.slug);

      const games =
        (record?.wins ?? 0) +
        (record?.losses ?? 0) +
        (record?.ties ?? 0);

      return {
        slug: team.slug,
        abbreviation: team.abbreviation,
        claimed: liveLeague || Boolean(owner),
        owner:
          owner?.display_name ||
          owner?.discord_username ||
          null,
        wins: record?.wins ?? 0,
        losses: record?.losses ?? 0,
        ties: record?.ties ?? 0,
        gamesPlayed: games,
        pointsFor: record?.pointsFor ?? 0,
        pointsAgainst: record?.pointsAgainst ?? 0,
        pointDifferential:
          (record?.pointsFor ?? 0) -
          (record?.pointsAgainst ?? 0),
        pointsPerGame:
          games > 0
            ? Number(
                ((record?.pointsFor ?? 0) / games).toFixed(1),
              )
            : 0,
        pointsAllowedPerGame:
          games > 0
            ? Number(
                ((record?.pointsAgainst ?? 0) / games).toFixed(1),
              )
            : 0,
        overall: dbTeam
          ? overallByTeamId.get(String(dbTeam.id)) ?? null
          : null,
      };
    });

    const claimedTeams = liveLeague
      ? 32
      : teams.filter((team) => team.claimed).length;

    return NextResponse.json({
      success: true,
      league: {
        id: league?.id ?? null,
        name: league?.name ?? "NEW ERA CFM",
        currentWeek: league?.current_week ?? null,
        season,
      },
      counts: {
        members: members.length,
        totalTeams: 32,
        claimedTeams,
        openTeams: Math.max(32 - claimedTeams, 0),
        gamesPlayed: gamesResult.data?.length ?? 0,
      },
      teams,
      syncStatus:
        league?.madden_sync_status ??
        "waiting_for_league_setup",
    });
  } catch (error) {
    console.error("League summary route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load league summary.",
      },
      { status: 500 },
    );
  }
}
