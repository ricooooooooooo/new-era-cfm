import { inferCurrentWeek } from "@/lib/madden/sync-week.mjs";
import { randomUUID } from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase-admin";

type Row = Record<string, unknown>;

type LeagueRow = {
  id: string;
  season: number | null;
  season_number: number | null;
  current_week: number | null;
};

type InternalTeam = {
  id: string;
  abbreviation: string;
};

type CanonicalPlayer = {
  id: string;
  canonical_name: string;
  normalized_name: string;
  primary_position: string | null;
};

export type ParsedSnallabotExport = {
  platform: string;
  externalLeagueId: string;
  exportType: string;
  kind:
    | "league_teams"
    | "standings"
    | "schedule"
    | "team_roster"
    | "free_agents"
    | "weekly_stat"
    | "extra"
    | "raw";
  stage: string | null;
  week: number | null;
  statType: string | null;
  teamExternalId: string | null;
  segments: string[];
};

function rec(value: unknown): Row {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Row)
    : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Row =>
          Boolean(item) &&
          typeof item === "object" &&
          !Array.isArray(item),
      )
    : [];
}

function str(value: unknown) {
  return String(value ?? "").trim();
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalTeamAbbreviation(value: unknown) {
  const abbreviation = str(value).toUpperCase();

  const aliases: Record<string, string> = {
    AZ: "ARI",
    JAC: "JAX",
    WSH: "WAS",
    OAK: "LV",
    SD: "LAC",
    STL: "LAR",
    LA: "LAR",
  };

  return aliases[abbreviation] ?? abbreviation;
}

function gameType(stageIndex: number) {
  if (stageIndex === 0) return "preseason";
  if (stageIndex === 2) return "postseason";
  return "regular";
}

function gameStatus(rawStatus: number) {
  if (rawStatus === 1) return "scheduled";
  if (rawStatus === 2 || rawStatus === 3) return "final";
  if (rawStatus > 0) return "in_progress";
  return "scheduled";
}

function development(value: unknown) {
  const trait = num(value);

  if (trait === 1) return "star";
  if (trait === 2) return "superstar";
  if (trait === 3) return "xfactor";

  return "normal";
}

function extractMaddenRatings(player: Row) {
  const attributes: Record<string, number> = {};

  for (const [key, value] of Object.entries(player)) {
    if (
      typeof value === "number" &&
      (key.endsWith("Rating") || key.endsWith("Ovr"))
    ) {
      attributes[key] = value;
    }
  }

  const aliases: Record<string, unknown> = {
    speed: player.speedRating,
    acceleration: player.accelRating,
    agility: player.agilityRating,
    strength: player.strengthRating,
    awareness: player.awareRating,
    changeOfDirection:
      player.changeOfDirectionRating ??
      player.changeDirRating,
    jumping: player.jumpRating,
    stamina: player.staminaRating,
    injury: player.injuryRating,
    toughness: player.toughnessRating,
    carrying: player.carryRating,
    catching: player.catchRating,
    spectacularCatch: player.specCatchRating,
    catchInTraffic: player.catchInTrafficRating,
    shortRoute: player.routeRunShortRating,
    mediumRoute: player.routeRunMedRating,
    deepRoute: player.routeRunDeepRating,
    release: player.releaseRating,
    trucking: player.truckRating,
    breakTackle: player.breakTackleRating,
    stiffArm: player.stiffArmRating,
    spinMove: player.spinMoveRating,
    jukeMove: player.jukeMoveRating,
    throwPower: player.throwPowerRating,
    throwShort: player.throwAccShortRating,
    throwMid: player.throwAccMidRating,
    throwDeep: player.throwAccDeepRating,
    throwOnRun: player.throwOnRunRating,
    playAction: player.playActionRating,
    passBlock: player.passBlockRating,
    passBlockPower: player.passBlockPowerRating,
    passBlockFinesse: player.passBlockFinesseRating,
    runBlock: player.runBlockRating,
    runBlockPower: player.runBlockPowerRating,
    runBlockFinesse: player.runBlockFinesseRating,
    impactBlock: player.impactBlockRating,
    leadBlock: player.leadBlockRating,
    tackle: player.tackleRating,
    hitPower: player.hitPowerRating,
    pursuit: player.pursuitRating,
    playRecognition: player.playRecRating,
    blockShedding: player.blockShedRating,
    powerMoves: player.powerMovesRating,
    finesseMoves: player.finesseMovesRating,
    manCoverage: player.manCoverRating,
    zoneCoverage: player.zoneCoverRating,
    press: player.pressRating,
    kickPower: player.kickPowerRating,
    kickAccuracy: player.kickAccuracyRating,
  };

  for (const [key, value] of Object.entries(aliases)) {
    if (typeof value === "number") {
      attributes[key] = value;
    }
  }

  return attributes;
}

function payloadSummary(payload: unknown) {
  if (Array.isArray(payload)) {
    return {
      payloadType: "array",
      topLevelKeys: [] as string[],
      itemCount: payload.length,
    };
  }

  const object = rec(payload);
  const keys = Object.keys(object).slice(0, 100);

  let itemCount: number | null = null;

  for (const value of Object.values(object)) {
    if (!Array.isArray(value)) continue;

    itemCount =
      itemCount === null
        ? value.length
        : Math.max(itemCount, value.length);
  }

  return {
    payloadType: "object",
    topLevelKeys: keys,
    itemCount,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error);
}

export function parseSnallabotSegments(
  segments: string[],
): ParsedSnallabotExport {
  if (segments.length < 3) {
    throw new Error(
      "Snallabot export path is missing platform, league ID, or export type.",
    );
  }

  const platform = str(segments[0]);
  const externalLeagueId = str(segments[1]);
  const section = str(segments[2]).toLowerCase();

  if (!platform || !externalLeagueId || !section) {
    throw new Error("Invalid Snallabot export path.");
  }

  if (section === "leagueteams") {
    return {
      platform,
      externalLeagueId,
      exportType: "leagueteams",
      kind: "league_teams",
      stage: null,
      week: null,
      statType: null,
      teamExternalId: null,
      segments,
    };
  }

  if (section === "standings") {
    return {
      platform,
      externalLeagueId,
      exportType: "standings",
      kind: "standings",
      stage: null,
      week: null,
      statType: null,
      teamExternalId: null,
      segments,
    };
  }

  if (section === "extra") {
    return {
      platform,
      externalLeagueId,
      exportType: "extra",
      kind: "extra",
      stage: null,
      week: null,
      statType: null,
      teamExternalId: null,
      segments,
    };
  }

  if (
    section === "freeagents" &&
    str(segments[3]).toLowerCase() === "roster"
  ) {
    return {
      platform,
      externalLeagueId,
      exportType: "roster_freeagents",
      kind: "free_agents",
      stage: null,
      week: null,
      statType: null,
      teamExternalId: null,
      segments,
    };
  }

  if (
    section === "team" &&
    segments.length >= 5 &&
    str(segments[4]).toLowerCase() === "roster"
  ) {
    const teamExternalId = str(segments[3]);

    if (!teamExternalId) {
      throw new Error("Snallabot team roster is missing team ID.");
    }

    return {
      platform,
      externalLeagueId,
      exportType: "roster_team",
      kind: "team_roster",
      stage: null,
      week: null,
      statType: null,
      teamExternalId,
      segments,
    };
  }

  if (section === "week" && segments.length >= 6) {
    const stage = str(segments[3]).toLowerCase();
    const week = Number(segments[4]);
    const statType = str(segments[5]).toLowerCase();

    if (!Number.isFinite(week) || week < 0) {
      throw new Error("Invalid Snallabot week number.");
    }

    return {
      platform,
      externalLeagueId,
      exportType:
        statType === "schedules"
          ? "schedules"
          : `week_${statType}`,
      kind:
        statType === "schedules"
          ? "schedule"
          : "weekly_stat",
      stage,
      week,
      statType,
      teamExternalId: null,
      segments,
    };
  }

  return {
    platform,
    externalLeagueId,
    exportType: section || "unknown",
    kind: "raw",
    stage: null,
    week: null,
    statType: null,
    teamExternalId: null,
    segments,
  };
}

async function goldJacketLeague(): Promise<LeagueRow> {
  const result = await supabaseAdmin
    .from("leagues")
    .select(
      "id,season,season_number,current_week",
    )
    .eq("slug", "gold-jacket-cfm")
    .maybeSingle();

  if (result.error) throw result.error;

  if (!result.data) {
    throw new Error("GOLD JACKET league row was not found.");
  }

  return result.data as LeagueRow;
}

async function latestExternalTeamMap(
  leagueId: string,
) {
  const syncResult = await supabaseAdmin
    .from("league_syncs")
    .select("payload")
    .eq("source", "snallabot")
    .eq("export_type", "leagueteams")
    .eq("status", "completed")
    .order("received_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (syncResult.error) throw syncResult.error;

  if (!syncResult.data) {
    throw new Error(
      "No completed Snallabot leagueteams export exists yet.",
    );
  }

  const externalTeams = rows(
    rec(syncResult.data.payload).leagueTeamInfoList,
  );

  if (externalTeams.length < 32) {
    throw new Error(
      `Expected 32 teams in leagueteams export; found ${externalTeams.length}.`,
    );
  }

  const internalResult = await supabaseAdmin
    .from("teams")
    .select("id,abbreviation")
    .eq("league_id", leagueId);

  if (internalResult.error) throw internalResult.error;

  const internalByAbbreviation = new Map<
    string,
    InternalTeam
  >(
    (internalResult.data ?? []).map((team) => [
      String(team.abbreviation).toUpperCase(),
      {
        id: String(team.id),
        abbreviation: String(
          team.abbreviation,
        ).toUpperCase(),
      },
    ]),
  );

  const result = new Map<string, InternalTeam>();

  for (const team of externalTeams) {
    const externalId = str(team.teamId);

    const abbreviation =
      canonicalTeamAbbreviation(
        team.abbrName ??
          team.teamAbbr ??
          team.abbreviation,
      );

    const internal =
      internalByAbbreviation.get(abbreviation);

    if (externalId && internal) {
      result.set(externalId, internal);
    }
  }

  if (result.size !== 32) {
    throw new Error(
      `Mapped ${result.size}/32 EA teams to Gold Jacket teams.`,
    );
  }

  return result;
}

async function insertChunks(
  table: string,
  values: Row[],
  size = 250,
) {
  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    const result = await supabaseAdmin
      .from(table)
      .insert(values.slice(index, index + size));

    if (result.error) throw result.error;
  }
}

async function importSchedule(
  payload: unknown,
  league: LeagueRow,
) {
  const games = rows(
    rec(payload).gameScheduleInfoList,
  ).filter(
    (game) =>
      num(game.homeTeamId) > 0 &&
      num(game.awayTeamId) > 0,
  );

  if (games.length === 0) {
    return {
      importedGames: 0,
      message: "Schedule payload contained no games.",
    };
  }

  const teamMap =
    await latestExternalTeamMap(league.id);

  const now = new Date().toISOString();

  const gameRows = games.map((game) => {
    const homeExternalId = str(game.homeTeamId);
    const awayExternalId = str(game.awayTeamId);

    const home = teamMap.get(homeExternalId);
    const away = teamMap.get(awayExternalId);

    if (!home || !away) {
      throw new Error(
        `Unable to map schedule teams ${awayExternalId} @ ${homeExternalId}.`,
      );
    }

    const season = num(game.seasonIndex) + 1;
    const week = num(game.weekIndex) + 1;
    const type = gameType(
      num(game.stageIndex, 1),
    );
    const status = gameStatus(
      num(game.status),
    );

    const homeScore =
      status === "final"
        ? num(game.homeScore)
        : null;

    const awayScore =
      status === "final"
        ? num(game.awayScore)
        : null;

    let winnerTeamId: string | null = null;

    if (
      status === "final" &&
      homeScore !== null &&
      awayScore !== null
    ) {
      if (homeScore > awayScore) {
        winnerTeamId = home.id;
      } else if (awayScore > homeScore) {
        winnerTeamId = away.id;
      }
    }

    const rawScheduleId =
      str(game.scheduleId) ||
      `${season}:${week}:${awayExternalId}:${homeExternalId}`;

    return {
      league_id: league.id,
      source: "ea_franchise",
      source_game_id: `ea:${rawScheduleId}`,
      season,
      week,
      game_type: type,
      home_team_id: home.id,
      away_team_id: away.id,
      home_team_abbreviation: home.abbreviation,
      away_team_abbreviation: away.abbreviation,
      scheduled_at: null,
      status,
      home_score: homeScore,
      away_score: awayScore,
      winner_team_id: winnerTeamId,
      is_primetime: Boolean(
        game.isGameOfTheWeek,
      ),
      broadcast_label: null,
      raw_payload: game,
      synced_at: now,
      updated_at: now,
    };
  });

  const groups = new Map<
    string,
    {
      season: number;
      week: number;
      gameType: string;
    }
  >();

  for (const game of gameRows) {
    groups.set(
      `${game.season}:${game.week}:${game.game_type}`,
      {
        season: game.season,
        week: game.week,
        gameType: game.game_type,
      },
    );
  }

  for (const group of groups.values()) {
    const deletion = await supabaseAdmin
      .from("league_games")
      .delete()
      .eq("league_id", league.id)
      .eq("source", "ea_franchise")
      .eq("season", group.season)
      .eq("week", group.week)
      .eq("game_type", group.gameType);

    if (deletion.error) throw deletion.error;
  }

  await insertChunks(
    "league_games",
    gameRows,
  );

  const incomingSeason = Math.max(
    ...gameRows.map((game) => game.season),
  );

  const currentSeason =
    Number(
      league.season ??
        league.season_number ??
        1,
    ) || 1;

  const existingWeek =
    incomingSeason > currentSeason
      ? 1
      : Number(
          league.current_week ?? 1,
        ) || 1;

  const regularGames =
    gameRows.filter(
      (game) =>
        game.game_type === "regular" &&
        game.season === incomingSeason,
    );

  const nextWeek =
    inferCurrentWeek({
      existingWeek,
      games: regularGames.map(
        (game) => ({
          week: game.week,
          status: game.status,
        }),
      ),
    });

  const leagueUpdate =
    await supabaseAdmin
      .from("leagues")
      .update({
        season: incomingSeason,
        season_number: incomingSeason,
        current_week: nextWeek,
      })
      .eq("id", league.id);

  if (leagueUpdate.error) {
    throw leagueUpdate.error;
  }

  return {
    importedGames: gameRows.length,
    season: incomingSeason,
    currentWeek: nextWeek,
  };
}

async function loadCanonicalPlayers() {
  const result: CanonicalPlayer[] = [];

  for (let from = 0; ; from += 1000) {
    const page = await supabaseAdmin
      .from("madden_players")
      .select(
        "id,canonical_name,normalized_name,primary_position",
      )
      .range(from, from + 999);

    if (page.error) throw page.error;

    const data =
      (page.data ?? []) as CanonicalPlayer[];

    result.push(...data);

    if (data.length < 1000) break;
  }

  return result;
}

async function loadExternalPlayerIds() {
  const result: Array<{
    player_id: string;
    external_id: string;
  }> = [];

  for (let from = 0; ; from += 1000) {
    const page = await supabaseAdmin
      .from("madden_player_external_ids")
      .select("player_id,external_id")
      .eq("source", "ea_franchise")
      .range(from, from + 999);

    if (page.error) throw page.error;

    const data = page.data ?? [];
    result.push(...data);

    if (data.length < 1000) break;
  }

  return result;
}

async function importRoster(
  payload: unknown,
  league: LeagueRow,
  parsed: ParsedSnallabotExport,
) {
  const roster = rows(
    rec(payload).rosterInfoList,
  );

  const isFreeAgents =
    parsed.kind === "free_agents";

  let internalTeamId: string | null = null;

  if (!isFreeAgents) {
    const teamMap =
      await latestExternalTeamMap(league.id);

    internalTeamId =
      teamMap.get(
        String(parsed.teamExternalId),
      )?.id ?? null;

    if (!internalTeamId) {
      throw new Error(
        `Unable to map EA roster team ${parsed.teamExternalId}.`,
      );
    }
  }

  const existingPlayers =
    await loadCanonicalPlayers();

  const externalMappings =
    await loadExternalPlayerIds();

  const byExternalId = new Map(
    externalMappings.map((mapping) => [
      String(mapping.external_id),
      String(mapping.player_id),
    ]),
  );

  const byNamePosition = new Map<
    string,
    CanonicalPlayer[]
  >();

  for (const player of existingPlayers) {
    const key =
      `${player.normalized_name}|${
        String(
          player.primary_position ?? "",
        ).toUpperCase()
      }`;

    const bucket =
      byNamePosition.get(key) ?? [];

    bucket.push(player);
    byNamePosition.set(key, bucket);
  }

  type Candidate = {
    raw: Row;
    externalId: string;
    canonicalName: string;
    normalizedName: string;
    position: string;
    playerId: string;
  };

  const candidates: Candidate[] = [];
  const canonicalInserts: Row[] = [];
  const externalInserts: Row[] = [];

  for (const player of roster) {
    const externalId = str(
      player.rosterId ??
        player.playerId ??
        player.id,
    );

    const firstName = str(player.firstName);
    const lastName = str(player.lastName);

    const canonicalName =
      `${firstName} ${lastName}`.trim() ||
      str(player.displayName) ||
      str(player.name);

    const normalizedName =
      normalizeName(canonicalName);

    const position =
      str(player.position).toUpperCase();

    if (
      !externalId ||
      !canonicalName ||
      !normalizedName
    ) {
      continue;
    }

    let playerId =
      byExternalId.get(externalId) ?? "";

    if (!playerId) {
      const key =
        `${normalizedName}|${position}`;

      const matches =
        byNamePosition.get(key) ?? [];

      if (matches.length === 1) {
        playerId = matches[0].id;
      } else {
        playerId = randomUUID();

        const created: CanonicalPlayer = {
          id: playerId,
          canonical_name: canonicalName,
          normalized_name: normalizedName,
          primary_position:
            position || null,
        };

        canonicalInserts.push(created);

        const bucket =
          byNamePosition.get(key) ?? [];

        bucket.push(created);
        byNamePosition.set(key, bucket);
      }

      byExternalId.set(
        externalId,
        playerId,
      );

      externalInserts.push({
        player_id: playerId,
        source: "ea_franchise",
        external_id: externalId,
      });
    }

    candidates.push({
      raw: player,
      externalId,
      canonicalName,
      normalizedName,
      position,
      playerId,
    });
  }

  if (canonicalInserts.length > 0) {
    await insertChunks(
      "madden_players",
      canonicalInserts,
    );
  }

  if (externalInserts.length > 0) {
    const deduped = Array.from(
      new Map(
        externalInserts.map((row) => [
          String(row.external_id),
          row,
        ]),
      ).values(),
    );

    const inserted = await supabaseAdmin
      .from("madden_player_external_ids")
      .insert(deduped);

    if (inserted.error) {
      throw inserted.error;
    }
  }

  let segmentDelete = supabaseAdmin
    .from("madden_player_snapshots")
    .delete()
    .eq("league_id", league.id)
    .eq("source", "ea_franchise");

  segmentDelete =
    internalTeamId === null
      ? segmentDelete.is("team_id", null)
      : segmentDelete.eq(
          "team_id",
          internalTeamId,
        );

  const segmentResult =
    await segmentDelete;

  if (segmentResult.error) {
    throw segmentResult.error;
  }

  const resolvedPlayerIds = Array.from(
    new Set(
      candidates.map(
        (candidate) => candidate.playerId,
      ),
    ),
  );

  for (
    let index = 0;
    index < resolvedPlayerIds.length;
    index += 250
  ) {
    const stale = await supabaseAdmin
      .from("madden_player_snapshots")
      .delete()
      .eq("league_id", league.id)
      .eq("source", "ea_franchise")
      .in(
        "player_id",
        resolvedPlayerIds.slice(
          index,
          index + 250,
        ),
      );

    if (stale.error) throw stale.error;
  }

  const capturedAt =
    new Date().toISOString();

  const snapshots: Row[] =
    candidates.map((candidate) => {
      const player = candidate.raw;

      const archetype =
        str(
          player.archetype ??
            player.positionArchetype ??
            player.playerScheme,
        ) || null;

      return {
        player_id: candidate.playerId,
        league_id: league.id,
        team_id: internalTeamId,
        source: "ea_franchise",
        source_priority: 300,
        game_version: "Madden 27",
        overall: nullableNumber(
          player.playerBestOvr ??
            player.playerOvr ??
            player.overallRating,
        ),
        jersey_number: nullableNumber(
          player.jerseyNum ??
            player.jerseyNumber,
        ),
        position:
          candidate.position || null,
        archetype,
        dev_trait: development(
          player.devTrait,
        ),
        attributes:
          extractMaddenRatings(player),
        source_payload: player,
        captured_at: capturedAt,
      };
    });

  if (snapshots.length > 0) {
    await insertChunks(
      "madden_player_snapshots",
      snapshots,
    );
  }

  return {
    importedPlayers: snapshots.length,
    teamId: internalTeamId,
    freeAgents: isFreeAgents,
  };
}


async function reconcileSnallabotLeagueState(
  originalLeague: LeagueRow,
  externalLeagueId: string,
) {
  const freshLeague =
    await goldJacketLeague();

  const originalSeason =
    Number(
      originalLeague.season ??
        originalLeague.season_number ??
        1,
    ) || 1;

  const season =
    Number(
      freshLeague.season ??
        freshLeague.season_number ??
        originalSeason,
    ) || originalSeason;

  const originalWeek =
    Number(
      originalLeague.current_week ?? 1,
    ) || 1;

  const freshWeek =
    Number(
      freshLeague.current_week ??
        originalWeek,
    ) || originalWeek;

  /*
   * A schedule import may have guessed one week too
   * far ahead before this reconciliation runs.
   * Preserve the pre-import week as the floor during
   * the same season, while never allowing old-season
   * state to hold a new season back.
   */
  const floorWeek =
    season === originalSeason
      ? Math.min(
          originalWeek,
          freshWeek,
        )
      : 1;

  const gamesResult =
    await supabaseAdmin
      .from("league_games")
      .select("week,status")
      .eq(
        "league_id",
        freshLeague.id,
      )
      .eq("season", season)
      .eq(
        "game_type",
        "regular",
      );

  if (gamesResult.error) {
    throw gamesResult.error;
  }

  const currentWeek =
    inferCurrentWeek({
      existingWeek: floorWeek,
      games:
        gamesResult.data ?? [],
    });

  const updateResult =
    await supabaseAdmin
      .from("leagues")
      .update({
        current_week: currentWeek,
        external_league_id:
          externalLeagueId,
      })
      .eq(
        "id",
        freshLeague.id,
      );

  if (updateResult.error) {
    throw updateResult.error;
  }

  return {
    season,
    currentWeek,
  };
}

export async function ingestSnallabotExport(
  parsed: ParsedSnallabotExport,
  payload: unknown,
  requestMeta: {
    contentType: string | null;
    userAgent: string | null;
  },
) {
  // GOLD_JACKET_NEW_FRANCHISE_GUARD
  const normalizedPlatform = parsed.platform.toLowerCase();
  if (!["xbsx", "xbox"].includes(normalizedPlatform)) {
    throw new Error(`Gold Jacket only accepts Xbox Series X|S exports; received ${parsed.platform}.`);
  }
  if (["25418", "1737523"].includes(parsed.externalLeagueId)) {
    throw new Error(`Blocked archived/donor Madden league ID ${parsed.externalLeagueId}.`);
  }

  const startedAt = Date.now();
  const summary = payloadSummary(payload);

  const inserted = await supabaseAdmin
    .from("league_syncs")
    .insert({
      source: "snallabot",
      export_type: parsed.exportType,
      status: "processing",
      payload,
      payload_type: summary.payloadType,
      top_level_keys: summary.topLevelKeys,
      item_count: summary.itemCount,
      request_headers: {
        contentType: requestMeta.contentType,
        userAgent: requestMeta.userAgent,
        platform: parsed.platform,
        externalLeagueId:
          parsed.externalLeagueId,
        exportType: parsed.exportType,
        kind: parsed.kind,
        stage: parsed.stage,
        week: parsed.week,
        statType: parsed.statType,
        teamExternalId:
          parsed.teamExternalId,
        segments: parsed.segments,
      },
      duration_ms: 0,
    })
    .select("id")
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  const syncId = String(inserted.data.id);

  try {
    const league = await goldJacketLeague();

    // GOLD_JACKET_IDENTITY_BIND
    const identityPayload = rec(payload);
    const incomingLeagueName = str(identityPayload.leagueName);
    if (incomingLeagueName && incomingLeagueName !== "GoldJacketSzn1") {
      throw new Error(`Unexpected Madden franchise '${incomingLeagueName}'. Expected GoldJacketSzn1.`);
    }
    if (parsed.kind === "extra") {
      if (incomingLeagueName !== "GoldJacketSzn1") {
        throw new Error("Extra export did not identify GoldJacketSzn1.");
      }
      const bindResult = await supabaseAdmin
        .from("leagues")
        .update({
          external_league_id: parsed.externalLeagueId,
          madden_external_league_id: parsed.externalLeagueId,
          madden_provider: "snallabot",
          madden_sync_status: "live_sync_active",
          madden_last_sync_at: new Date().toISOString(),
          madden_last_sync_error: null,
        })
        .eq("id", league.id);
      if (bindResult.error) throw bindResult.error;
    }

    let action: Record<string, unknown> = {
      stored: true,
    };

    if (parsed.kind === "league_teams") {
      const teamCount = rows(
        rec(payload).leagueTeamInfoList,
      ).length;

      if (teamCount !== 32) {
        throw new Error(
          `Expected 32 league teams but received ${teamCount}.`,
        );
      }

      action = {
        stored: true,
        mappedTeams: teamCount,
      };
    } else if (parsed.kind === "schedule") {
      action = await importSchedule(
        payload,
        league,
      );
    } else if (
      parsed.kind === "team_roster" ||
      parsed.kind === "free_agents"
    ) {
      action = await importRoster(
        payload,
        league,
        parsed,
      );
    }

    const completedAt =
      new Date().toISOString();


    if (
      parsed.kind === "schedule" ||
      parsed.kind === "extra" ||
      parsed.kind === "standings"
    ) {
      const reconciledLeague =
        await reconcileSnallabotLeagueState(
          league,
          parsed.externalLeagueId,
        );

      action = {
        ...action,
        reconciledLeague,
      };
    }

    const completed = await supabaseAdmin
      .from("league_syncs")
      .update({
        status: "completed",
        error_message: null,
        processed_at: completedAt,
        duration_ms:
          Date.now() - startedAt,
      })
      .eq("id", syncId);

    if (completed.error) {
      throw completed.error;
    }

    return {
      success: true,
      syncId,
      exportType: parsed.exportType,
      kind: parsed.kind,
      ...action,
    };
  } catch (error) {
    const message = errorMessage(error);

    await supabaseAdmin
      .from("league_syncs")
      .update({
        status: "failed",
        error_message: message.slice(
          0,
          2000,
        ),
        processed_at:
          new Date().toISOString(),
        duration_ms:
          Date.now() - startedAt,
      })
      .eq("id", syncId);

    throw error;
  }
}
