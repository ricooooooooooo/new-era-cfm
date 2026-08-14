import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

type PlayerRow = {
  id: string;
  canonical_name: string;
  normalized_name: string;
  primary_position: string | null;
};

function rec(value: unknown): Row {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Row)
    : {};
}

function arr(value: unknown): Row[] {
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

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalAbbreviation(value: unknown) {
  const abbr = str(value).toUpperCase();

  const aliases: Record<string, string> = {
    AZ: "ARI",
    JAC: "JAX",
    WSH: "WAS",
    OAK: "LV",
    SD: "LAC",
    STL: "LAR",
  };

  return aliases[abbr] ?? abbr;
}

function extractMaddenRatings(player: Row) {
  const attributes: Record<string, number> = {};

  // Preserve every numeric EA Madden rating automatically.
  // Examples: speedRating, accelRating, catchRating,
  // runBlockRating, manCoverRating, etc.
  for (const [key, value] of Object.entries(player)) {
    if (
      typeof value === "number" &&
      (
        key.endsWith("Rating") ||
        key.endsWith("Ovr")
      )
    ) {
      attributes[key] = value;
    }
  }

  // Friendly aliases used by the New Era UI.
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

function development(value: unknown) {
  const trait = num(value);

  if (trait === 1) return "star";
  if (trait === 2) return "superstar";
  if (trait === 3) return "xfactor";

  return "normal";
}

function authorized(request: NextRequest) {
  const configured = process.env.MADDEN_SYNC_SECRET;
  const auth = request.headers.get("authorization");

  return Boolean(
    configured &&
      auth?.startsWith("Bearer ") &&
      auth.slice(7).trim() === configured,
  );
}

async function loadAllPlayers() {
  const rows: PlayerRow[] = [];

  for (let from = 0; ; from += 1000) {
    const result = await supabaseAdmin
      .from("madden_players")
      .select(
        "id, canonical_name, normalized_name, primary_position",
      )
      .range(from, from + 999);

    if (result.error) throw result.error;

    const page = (result.data ?? []) as PlayerRow[];
    rows.push(...page);

    if (page.length < 1000) break;
  }

  return rows;
}

async function loadExternalIds() {
  const rows: Array<{
    player_id: string;
    external_id: string;
  }> = [];

  for (let from = 0; ; from += 1000) {
    const result = await supabaseAdmin
      .from("madden_player_external_ids")
      .select("player_id, external_id")
      .eq("source", "ea_franchise")
      .range(from, from + 999);

    if (result.error) throw result.error;

    const page = result.data ?? [];
    rows.push(...page);

    if (page.length < 1000) break;
  }

  return rows;
}

async function batchInsert(
  table: string,
  rows: Row[],
  size = 400,
) {
  for (let index = 0; index < rows.length; index += size) {
    const result = await supabaseAdmin
      .from(table)
      .insert(rows.slice(index, index + size));

    if (result.error) throw result.error;
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    status: "ready",
    revision: "m27-live-rosters-v4-launch",
  });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const body = rec(await request.json());

    const leagueResult = await supabaseAdmin
      .from("leagues")
      .select("id")
      .eq("slug", "new-era-cfm")
      .maybeSingle();

    if (leagueResult.error) throw leagueResult.error;
    if (!leagueResult.data) {
      throw new Error("New Era league not found.");
    }

    const leagueId = leagueResult.data.id;

    const teamsResult = await supabaseAdmin
      .from("teams")
      .select("id, abbreviation");

    if (teamsResult.error) throw teamsResult.error;

    const teams = new Map(
      (teamsResult.data ?? []).map((team) => [
        String(team.abbreviation).toUpperCase(),
        String(team.id),
      ]),
    );

    const existingPlayers = await loadAllPlayers();
    const externalIds = await loadExternalIds();

    const playerByExternalId = new Map(
      externalIds.map((row) => [
        String(row.external_id),
        String(row.player_id),
      ]),
    );

    const playersByKey = new Map<string, PlayerRow>();
    const playersByName = new Map<string, PlayerRow[]>();

    for (const player of existingPlayers) {
      const position =
        String(player.primary_position ?? "").toUpperCase();

      playersByKey.set(
        `${player.normalized_name}|${position}`,
        player,
      );

      const existing =
        playersByName.get(player.normalized_name) ?? [];

      existing.push(player);
      playersByName.set(player.normalized_name, existing);
    }

    const incoming: Array<{
      player: Row;
      teamId: string | null;
    }> = [];

    for (const rosterValue of arr(body.rosters)) {
      const roster = rec(rosterValue);
      const abbreviation = canonicalAbbreviation(
        roster.abbreviation,
      );

      const internalTeamId =
        teams.get(abbreviation) ?? null;

      if (!internalTeamId) {
        throw new Error(
          `Unable to map roster team ${abbreviation}.`,
        );
      }

      for (const player of arr(roster.players)) {
        incoming.push({
          player,
          teamId: internalTeamId,
        });
      }
    }

    for (const player of arr(body.freeAgents)) {
      incoming.push({
        player,
        teamId: null,
      });
    }

    const seenRosterIds = new Set<string>();

    const snapshots: Row[] = [];
    const newExternalIds: Row[] = [];

    let matchedPlayers = 0;
    let createdPlayers = 0;

    const now = new Date().toISOString();

    for (const item of incoming) {
      const player = item.player;
      const rosterId = str(player.rosterId);

      if (!rosterId || seenRosterIds.has(rosterId)) {
        continue;
      }

      seenRosterIds.add(rosterId);

      const firstName = str(player.firstName);
      const lastName = str(player.lastName);
      const fullName =
        `${firstName} ${lastName}`.trim() ||
        `EA Player ${rosterId}`;

      const normalized = normalizeName(fullName);
      const position = str(player.position).toUpperCase();

      let playerId =
        playerByExternalId.get(rosterId) ?? null;

      if (!playerId) {
        const exact =
          playersByKey.get(
            `${normalized}|${position}`,
          ) ?? null;

        const loose =
          playersByName.get(normalized)?.[0] ?? null;

        const matched = exact ?? loose;

        if (matched) {
          playerId = matched.id;
          matchedPlayers += 1;
        } else {
          const created = await supabaseAdmin
            .from("madden_players")
            .insert({
              canonical_name: fullName,
              normalized_name: normalized,
              primary_position: position || null,
              baseline_team_id: null,
            })
            .select(
              "id, canonical_name, normalized_name, primary_position",
            )
            .single();

          if (created.error) throw created.error;

          playerId = created.data.id;
          createdPlayers += 1;

          const newRow = created.data as PlayerRow;

          playersByKey.set(
            `${newRow.normalized_name}|${position}`,
            newRow,
          );

          const existing =
            playersByName.get(newRow.normalized_name) ??
            [];

          existing.push(newRow);
          playersByName.set(
            newRow.normalized_name,
            existing,
          );
        }

        if (!playerId) {
          throw new Error(
            `Unable to resolve player ID for EA roster ID ${rosterId}.`,
          );
        }

        playerByExternalId.set(rosterId, playerId);

        newExternalIds.push({
          player_id: playerId,
          source: "ea_franchise",
          external_id: rosterId,
        });
      }

      if (!playerId) {
        throw new Error(
          `Unable to resolve player ID for EA roster ID ${rosterId}.`,
        );
      }

      const overall = Math.max(
        0,
        Math.min(
          99,
          num(
            player.playerBestOvr,
            num(player.playerSchemeOvr),
          ),
        ),
      );

      snapshots.push({
        player_id: playerId,
        league_id: leagueId,
        team_id: item.teamId,
        source: "ea_franchise",
        source_priority: 300,
        game_version: "Madden 27",
        overall,
        jersey_number: Math.max(
          0,
          Math.min(99, num(player.jerseyNum)),
        ),
        position: position || null,
        archetype: null,
        dev_trait: development(player.devTrait),
        attributes: extractMaddenRatings(player),
        source_payload: player,
        captured_at: now,
        imported_at: now,
      });
    }

    if (newExternalIds.length > 0) {
      for (
        let index = 0;
        index < newExternalIds.length;
        index += 500
      ) {
        const externalResult = await supabaseAdmin
          .from("madden_player_external_ids")
          .upsert(
            newExternalIds.slice(index, index + 500),
            {
              onConflict: "source,external_id",
              ignoreDuplicates: true,
            },
          );

        if (externalResult.error) {
          throw externalResult.error;
        }
      }
    }

    const deleteResult = await supabaseAdmin
      .from("madden_player_snapshots")
      .delete()
      .eq("league_id", leagueId)
      .eq("source", "ea_franchise")
      .eq("game_version", "Madden 27");

    if (deleteResult.error) throw deleteResult.error;

    const uniqueSnapshots = Array.from(
      new Map(
        snapshots.map((snapshot) => [
          String(snapshot.player_id),
          snapshot,
        ]),
      ).values(),
    );

    console.log(
      `EA roster snapshots: ${snapshots.length} raw / ${uniqueSnapshots.length} unique`,
    );

    await batchInsert(
      "madden_player_snapshots",
      uniqueSnapshots,
      250,
    );

    const runResult = await supabaseAdmin
      .from("madden_import_runs")
      .insert({
        source: "ea_franchise",
        game_version: "Madden 27",
        league_id: leagueId,
        status: "completed",
        player_count: uniqueSnapshots.length,
        team_count: arr(body.rosters).length,
        details: {
          currentWeek: body.currentWeek ?? null,
          matchedPlayers,
          createdPlayers,
          liveRosterImport: true,
        },
        completed_at: now,
      });

    if (runResult.error) {
      console.error(runResult.error);
    }

    return NextResponse.json({
      success: true,
      revision: "m27-live-rosters-v4-launch",
      teamsImported: arr(body.rosters).length,
      playersImported: uniqueSnapshots.length,
      matchedPlayers,
      createdPlayers,
      freeAgentsImported: arr(body.freeAgents).length,
    });
  } catch (error) {
    console.error("EA roster import failed:", error);

    const details =
      error && typeof error === "object"
        ? {
            message:
              "message" in error
                ? String(error.message ?? "")
                : null,
            code:
              "code" in error
                ? String(error.code ?? "")
                : null,
            details:
              "details" in error
                ? String(error.details ?? "")
                : null,
            hint:
              "hint" in error
                ? String(error.hint ?? "")
                : null,
          }
        : null;

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : details?.message ||
              "EA roster import failed.",
        debug: details,
      },
      { status: 500 },
    );
  }
}
