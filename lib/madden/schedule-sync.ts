import { postPredictionMarketBatch } from "@/lib/discord/prediction-webhook";
import { NFL_TEAMS } from "@/lib/nfl-teams";
import { syncPredictionMarketsForGames } from "@/lib/predictions/market-engine";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type {
  CanonicalGameStatus,
  CanonicalScheduleImportInput,
  LeagueGameRow,
} from "./schedule-types";

type LeagueRow = {
  id: string;
  slug: string;
  season: number | null;
  current_week: number | null;
};

type TeamRow = {
  id: string;
  city: string | null;
  name: string;
  abbreviation: string;
};

type ExistingGameRow = LeagueGameRow;

const SOURCE_PRIORITIES: Record<string, number> = {
  ea_franchise: 300,
  companion_app: 300,
  snallabot: 280,
  mymadden: 280,
  dynasty_dashboard: 270,
  daddyleagues: 270,
  manual_quick_sync: 100,
  manual: 90,
};

function sourcePriority(source: string) {
  return SOURCE_PRIORITIES[source.toLowerCase()] ?? 150;
}

function normalizeTeamAbbreviation(value: string) {
  const cleaned = value.trim().toUpperCase();

  const aliases: Record<string, string> = {
    AZ: "ARI",
    JAC: "JAX",
    WSH: "WAS",
    OAK: "LV",
    SD: "LAC",
    STL: "LAR",
    LA: "LAR",
  };

  const direct = aliases[cleaned] ?? cleaned;

  const byKnownTeam = NFL_TEAMS.find((team) =>
    [
      team.abbreviation,
      team.slug,
      team.name,
      `${team.city} ${team.name}`,
      ...team.aliases,
    ]
      .map((candidate) => candidate.toLowerCase())
      .includes(value.trim().toLowerCase()),
  );

  return byKnownTeam?.abbreviation ?? direct;
}

function normalizeStatus(value: string | null | undefined): CanonicalGameStatus {
  const status = value?.trim().toLowerCase() ?? "scheduled";

  if (["final", "completed", "complete", "played"].includes(status)) {
    return "final";
  }

  if (["in_progress", "in-progress", "live", "playing"].includes(status)) {
    return "in_progress";
  }

  if (["cancelled", "canceled"].includes(status)) {
    return "cancelled";
  }

  return "scheduled";
}

function integerOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function normalizeGameType(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "regular";
}

function canonicalGameKey(input: {
  season: number;
  gameType: string;
  week: number;
  awayTeam: string;
  homeTeam: string;
}) {
  return [
    input.season,
    input.gameType,
    input.week,
    input.awayTeam,
    input.homeTeam,
  ]
    .join(":")
    .toLowerCase();
}

async function getLeague(slug: string) {
  const result = await supabaseAdmin
    .from("leagues")
    .select("id, slug, season, current_week")
    .eq("slug", slug)
    .maybeSingle();

  if (result.error) throw result.error;
  if (!result.data) {
    throw new Error(`League '${slug}' was not found.`);
  }

  return result.data as LeagueRow;
}

async function getTeams() {
  const result = await supabaseAdmin
    .from("teams")
    .select("id, city, name, abbreviation");

  if (result.error) throw result.error;

  return (result.data ?? []) as TeamRow[];
}

export async function importCanonicalSchedule(
  input: CanonicalScheduleImportInput,
) {
  if (!Array.isArray(input.games) || input.games.length === 0) {
    throw new Error("At least one schedule game is required.");
  }

  const leagueSlug = input.leagueSlug?.trim() || "new-era-cfm";
  const source = input.source?.trim() || "ea_franchise";
  const provider = input.provider?.trim() || source;
  const gameVersion = input.gameVersion?.trim() || "Madden 27";
  const syncType = input.syncType?.trim() || "schedule";
  const priority = sourcePriority(source);
  const league = await getLeague(leagueSlug);
  const teams = await getTeams();

  const teamsByAbbreviation = new Map(
    teams.map((team) => [team.abbreviation.toUpperCase(), team]),
  );

  const defaultSeason =
    integerOrNull(input.season) ?? integerOrNull(league.season) ?? 1;

  const runResult = await supabaseAdmin
    .from("madden_sync_runs")
    .insert({
      league_id: league.id,
      source,
      provider,
      game_version: gameVersion,
      sync_type: syncType,
      status: "running",
      details: {
        requestedGames: input.games.length,
        requestedCurrentWeek: input.currentWeek ?? null,
      },
    })
    .select("id")
    .single();

  if (runResult.error) throw runResult.error;

  const syncRunId = String(runResult.data.id);

  await supabaseAdmin
    .from("leagues")
    .update({
      madden_provider: provider,
      madden_sync_status: "syncing",
      madden_last_sync_error: null,
    })
    .eq("id", league.id);

  const importedGames: LeagueGameRow[] = [];
  let skippedGames = 0;

  try {
    for (const rawGame of input.games) {
      const sourceGameId = String(rawGame.sourceGameId ?? "").trim();

      if (!sourceGameId) {
        throw new Error("Every game requires sourceGameId.");
      }

      const week = integerOrNull(rawGame.week);
      if (!week || week < 1) {
        throw new Error(`Game '${sourceGameId}' has an invalid week.`);
      }

      const season = integerOrNull(rawGame.season) ?? defaultSeason;
      const gameType = normalizeGameType(rawGame.gameType);
      const homeAbbreviation = normalizeTeamAbbreviation(rawGame.homeTeam);
      const awayAbbreviation = normalizeTeamAbbreviation(rawGame.awayTeam);
      const homeTeam = teamsByAbbreviation.get(homeAbbreviation);
      const awayTeam = teamsByAbbreviation.get(awayAbbreviation);

      if (!homeTeam || !awayTeam) {
        throw new Error(
          `Unable to resolve teams for '${sourceGameId}': ` +
            `${rawGame.awayTeam} @ ${rawGame.homeTeam}`,
        );
      }

      if (homeTeam.id === awayTeam.id) {
        throw new Error(`Game '${sourceGameId}' cannot use the same team twice.`);
      }

      const status = normalizeStatus(rawGame.status);
      const homeScore = integerOrNull(rawGame.homeScore);
      const awayScore = integerOrNull(rawGame.awayScore);

      if (
        status === "final" &&
        (homeScore === null || awayScore === null)
      ) {
        throw new Error(
          `Final game '${sourceGameId}' requires both scores.`,
        );
      }

      const winnerTeamId =
        status === "final" &&
        homeScore !== null &&
        awayScore !== null &&
        homeScore !== awayScore
          ? homeScore > awayScore
            ? homeTeam.id
            : awayTeam.id
          : null;

      const stableGameKey = canonicalGameKey({
        season,
        gameType,
        week,
        awayTeam: awayTeam.abbreviation,
        homeTeam: homeTeam.abbreviation,
      });

      const row = {
        league_id: league.id,
        source,
        source_game_id: sourceGameId,
        canonical_game_key: stableGameKey,
        source_priority: priority,
        sync_run_id: syncRunId,
        season,
        week,
        game_type: gameType,
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        home_team_abbreviation: homeTeam.abbreviation,
        away_team_abbreviation: awayTeam.abbreviation,
        scheduled_at: rawGame.scheduledAt || null,
        status,
        home_score: homeScore,
        away_score: awayScore,
        winner_team_id: winnerTeamId,
        is_primetime: Boolean(rawGame.isPrimetime),
        broadcast_label: rawGame.broadcastLabel?.trim() || null,
        raw_payload: rawGame.rawPayload ?? {},
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const existingResult = await supabaseAdmin
        .from("league_games")
        .select("*")
        .eq("league_id", league.id)
        .eq("canonical_game_key", stableGameKey)
        .maybeSingle();

      if (existingResult.error) throw existingResult.error;

      const existing = existingResult.data as ExistingGameRow | null;
      let saved: LeagueGameRow;

      if (existing) {
        if (Number(existing.source_priority ?? 0) > priority) {
          saved = existing;
          skippedGames += 1;
        } else {
          const updated = await supabaseAdmin
            .from("league_games")
            .update(row)
            .eq("id", existing.id)
            .select("*")
            .single();

          if (updated.error) throw updated.error;
          saved = updated.data as LeagueGameRow;
        }
      } else {
        const inserted = await supabaseAdmin
          .from("league_games")
          .insert(row)
          .select("*")
          .single();

        if (inserted.error) throw inserted.error;
        saved = inserted.data as LeagueGameRow;
      }

      importedGames.push(saved);
    }

    const currentWeek =
      integerOrNull(input.currentWeek) ??
      Math.max(...importedGames.map((game) => game.week));

    const leagueUpdate = await supabaseAdmin
      .from("leagues")
      .update({
        season: defaultSeason,
        current_week: currentWeek,
        madden_provider: provider,
        madden_sync_status:
          source === "manual_quick_sync" ? "manual_sync_active" : "live_sync_active",
        madden_last_sync_at: new Date().toISOString(),
        madden_last_sync_error: null,
      })
      .eq("id", league.id);

    if (leagueUpdate.error) throw leagueUpdate.error;

    const marketResult = await syncPredictionMarketsForGames(importedGames);

    const settingsResult = await supabaseAdmin
      .from("prediction_automation_settings")
      .select("discord_post_enabled")
      .eq("league_id", league.id)
      .maybeSingle();

    if (settingsResult.error) {
      console.error(
        "Unable to read prediction Discord setting:",
        settingsResult.error,
      );
    }

    if (
      settingsResult.data?.discord_post_enabled &&
      !input.suppressPredictionDiscord
    ) {
      await postPredictionMarketBatch({
        season: defaultSeason,
        week: currentWeek,
        createdMarkets: marketResult.createdMarkets,
        totalGames: importedGames.length,
      });
    }

    const completedAt = new Date().toISOString();
    const syncStatus = skippedGames > 0 ? "partial" : "success";

    await supabaseAdmin
      .from("madden_sync_runs")
      .update({
        status: syncStatus,
        imported_games: importedGames.length - skippedGames,
        skipped_games: skippedGames,
        completed_at: completedAt,
        details: {
          requestedGames: input.games.length,
          currentWeek,
          season: defaultSeason,
          sourcePriority: priority,
          createdMarkets: marketResult.createdMarkets,
          settledMarkets: marketResult.settledMarkets,
          manualReview: marketResult.manualReview,
        },
      })
      .eq("id", syncRunId);

    return {
      syncRunId,
      leagueId: league.id,
      provider,
      source,
      season: defaultSeason,
      currentWeek,
      importedGames: importedGames.length - skippedGames,
      skippedGames,
      ...marketResult,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const completedAt = new Date().toISOString();

    await Promise.all([
      supabaseAdmin
        .from("madden_sync_runs")
        .update({
          status: "failed",
          imported_games: importedGames.length,
          skipped_games: skippedGames,
          error_message: message,
          completed_at: completedAt,
          details: {
            requestedGames: input.games.length,
            sourcePriority: priority,
          },
        })
        .eq("id", syncRunId),
      supabaseAdmin
        .from("leagues")
        .update({
          madden_sync_status: "sync_error",
          madden_last_sync_error: message,
        })
        .eq("id", league.id),
    ]);

    throw error;
  }
}
