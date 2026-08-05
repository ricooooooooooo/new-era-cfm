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

function normalizeTeamAbbreviation(value: string) {
  const cleaned = value.trim().toUpperCase();

  const aliases: Record<string, string> = {
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

  if (
    ["final", "completed", "complete", "played"].includes(status)
  ) {
    return "final";
  }

  if (
    ["in_progress", "in-progress", "live", "playing"].includes(status)
  ) {
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
  const league = await getLeague(leagueSlug);
  const teams = await getTeams();

  const teamsByAbbreviation = new Map(
    teams.map((team) => [team.abbreviation.toUpperCase(), team]),
  );

  const defaultSeason =
    integerOrNull(input.season) ??
    integerOrNull(league.season) ??
    1;

  const importedGames: LeagueGameRow[] = [];

  for (const rawGame of input.games) {
    const sourceGameId = String(rawGame.sourceGameId ?? "").trim();

    if (!sourceGameId) {
      throw new Error("Every game requires sourceGameId.");
    }

    const week = integerOrNull(rawGame.week);
    if (!week || week < 1) {
      throw new Error(`Game '${sourceGameId}' has an invalid week.`);
    }

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

    const status = normalizeStatus(rawGame.status);
    const homeScore = integerOrNull(rawGame.homeScore);
    const awayScore = integerOrNull(rawGame.awayScore);

    const winnerTeamId =
      status === "final" &&
      homeScore !== null &&
      awayScore !== null &&
      homeScore !== awayScore
        ? homeScore > awayScore
          ? homeTeam.id
          : awayTeam.id
        : null;

    const row = {
      league_id: league.id,
      source,
      source_game_id: sourceGameId,
      season: integerOrNull(rawGame.season) ?? defaultSeason,
      week,
      game_type: rawGame.gameType?.trim() || "regular",
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

    const existing = await supabaseAdmin
      .from("league_games")
      .select("id")
      .eq("league_id", league.id)
      .eq("source", source)
      .eq("source_game_id", sourceGameId)
      .maybeSingle();

    if (existing.error) throw existing.error;

    let saved: LeagueGameRow;

    if (existing.data) {
      const updated = await supabaseAdmin
        .from("league_games")
        .update(row)
        .eq("id", existing.data.id)
        .select("*")
        .single();

      if (updated.error) throw updated.error;
      saved = updated.data as LeagueGameRow;
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

  if (settingsResult.data?.discord_post_enabled) {
    await postPredictionMarketBatch({
      season: defaultSeason,
      week: currentWeek,
      createdMarkets: marketResult.createdMarkets,
      totalGames: importedGames.length,
    });
  }

  return {
    leagueId: league.id,
    season: defaultSeason,
    currentWeek,
    importedGames: importedGames.length,
    ...marketResult,
  };
}
