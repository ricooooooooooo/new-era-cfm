import { supabaseAdmin } from "@/lib/supabase-admin";

export type MaddenSyncStatus = {
  success: true;
  league: {
    id: string;
    name: string;
    slug: string;
    season: number;
    currentWeek: number;
    externalLeagueId: string | null;
    provider: string;
    syncStatus: string;
    lastSyncAt: string | null;
    lastSyncError: string | null;
  } | null;
  counts: {
    baselinePlayers: number;
    franchisePlayers: number;
    baselineTeams: number;
    leagueGames: number;
    currentWeekGames: number;
    finalGames: number;
  };
  latestRun: {
    id: string;
    source: string;
    provider: string | null;
    status: string;
    importedGames: number;
    skippedGames: number;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
  } | null;
  sourceMode: "waiting_for_league" | "baseline_plus_manual" | "live_franchise";
  infrastructureReady: boolean;
};

export async function getMaddenSyncStatus(): Promise<MaddenSyncStatus> {
  const leagueResult = await supabaseAdmin
    .from("leagues")
    .select(
      "id, name, slug, season, current_week, madden_external_league_id, madden_provider, madden_sync_status, madden_last_sync_at, madden_last_sync_error",
    )
    .eq("slug", "new-era-cfm")
    .maybeSingle();

  if (leagueResult.error) throw leagueResult.error;

  const league = leagueResult.data;

  const [baselinePlayers, baselineTeams] = await Promise.all([
    supabaseAdmin
      .from("madden_player_snapshots")
      .select("id", { count: "exact", head: true })
      .is("league_id", null)
      .eq("source", "maddenratings")
      .eq("game_version", "Madden 27"),
    supabaseAdmin
      .from("madden_team_snapshots")
      .select("id", { count: "exact", head: true })
      .is("league_id", null)
      .eq("source", "maddenratings")
      .eq("game_version", "Madden 27"),
  ]);

  if (baselinePlayers.error) throw baselinePlayers.error;
  if (baselineTeams.error) throw baselineTeams.error;

  if (!league) {
    return {
      success: true,
      league: null,
      counts: {
        baselinePlayers: baselinePlayers.count ?? 0,
        franchisePlayers: 0,
        baselineTeams: baselineTeams.count ?? 0,
        leagueGames: 0,
        currentWeekGames: 0,
        finalGames: 0,
      },
      latestRun: null,
      sourceMode: "waiting_for_league",
      infrastructureReady: true,
    };
  }

  const season = Number(league.season ?? 1);
  const currentWeek = Number(league.current_week ?? 1);

  const [franchisePlayers, leagueGames, currentWeekGames, finalGames, latestRun] =
    await Promise.all([
      supabaseAdmin
        .from("madden_player_snapshots")
        .select("id", { count: "exact", head: true })
        .eq("league_id", league.id)
        .neq("source", "maddenratings"),
      supabaseAdmin
        .from("league_games")
        .select("id", { count: "exact", head: true })
        .eq("league_id", league.id)
        .eq("season", season),
      supabaseAdmin
        .from("league_games")
        .select("id", { count: "exact", head: true })
        .eq("league_id", league.id)
        .eq("season", season)
        .eq("week", currentWeek),
      supabaseAdmin
        .from("league_games")
        .select("id", { count: "exact", head: true })
        .eq("league_id", league.id)
        .eq("season", season)
        .eq("status", "final"),
      supabaseAdmin
        .from("madden_sync_runs")
        .select(
          "id, source, provider, status, imported_games, skipped_games, error_message, started_at, completed_at",
        )
        .eq("league_id", league.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  for (const result of [
    franchisePlayers,
    leagueGames,
    currentWeekGames,
    finalGames,
    latestRun,
  ]) {
    if (result.error) throw result.error;
  }

  const franchiseCount = franchisePlayers.count ?? 0;

  return {
    success: true,
    league: {
      id: league.id,
      name: league.name ?? "NEW ERA CFM",
      slug: league.slug,
      season,
      currentWeek,
      externalLeagueId: league.madden_external_league_id ?? null,
      provider: league.madden_provider ?? "manual",
      syncStatus: league.madden_sync_status ?? "baseline_ready",
      lastSyncAt: league.madden_last_sync_at ?? null,
      lastSyncError: league.madden_last_sync_error ?? null,
    },
    counts: {
      baselinePlayers: baselinePlayers.count ?? 0,
      franchisePlayers: franchiseCount,
      baselineTeams: baselineTeams.count ?? 0,
      leagueGames: leagueGames.count ?? 0,
      currentWeekGames: currentWeekGames.count ?? 0,
      finalGames: finalGames.count ?? 0,
    },
    latestRun: latestRun.data
      ? {
          id: latestRun.data.id,
          source: latestRun.data.source,
          provider: latestRun.data.provider,
          status: latestRun.data.status,
          importedGames: Number(latestRun.data.imported_games ?? 0),
          skippedGames: Number(latestRun.data.skipped_games ?? 0),
          errorMessage: latestRun.data.error_message ?? null,
          startedAt: latestRun.data.started_at,
          completedAt: latestRun.data.completed_at ?? null,
        }
      : null,
    sourceMode:
      franchiseCount > 0 ? "live_franchise" : "baseline_plus_manual",
    infrastructureReady: true,
  };
}
