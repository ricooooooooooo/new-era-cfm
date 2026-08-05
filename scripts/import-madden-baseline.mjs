#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex < 1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
}

const inputPath = process.argv[2] ?? "data/madden/madden27-baseline.json";
const input = JSON.parse(await readFile(inputPath, "utf8"));

if (!Array.isArray(input.teams) || !input.gameVersion) {
  throw new Error("The baseline JSON file is not valid.");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeName(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function chunks(values, size = 500) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function selectAll(table, columns, filters = []) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);

    for (const filter of filters) {
      query = query[filter.method](filter.column, filter.value);
    }

    const { data, error } = await query;
    if (error) throw error;

    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }

  return rows;
}

const startedAt = new Date().toISOString();
const importRunId = randomUUID();

const { error: runStartError } = await supabase.from("madden_import_runs").insert({
  id: importRunId,
  source: input.source ?? "maddenratings",
  game_version: input.gameVersion,
  status: "running",
  started_at: startedAt,
  details: { inputPath, capturedAt: input.capturedAt ?? null },
});

if (runStartError) throw runStartError;

try {
  const teams = await selectAll(
    "teams",
    "id, abbreviation, city, name",
  );
  const teamByAbbreviation = new Map(
    teams.map((team) => [String(team.abbreviation).toUpperCase(), team]),
  );

  const existingPlayers = await selectAll(
    "madden_players",
    "id, normalized_name, primary_position, baseline_team_id",
  );
  const existingAliases = await selectAll(
    "madden_player_external_ids",
    "player_id, source, external_id",
    [{ method: "eq", column: "source", value: input.source ?? "maddenratings" }],
  );

  const aliasToPlayerId = new Map(
    existingAliases.map((alias) => [alias.external_id, alias.player_id]),
  );
  const identityToPlayerId = new Map(
    existingPlayers.map((player) => [
      `${player.normalized_name}|${player.primary_position ?? ""}|${player.baseline_team_id ?? ""}`,
      player.id,
    ]),
  );

  const playerRows = [];
  const aliasRows = [];
  const snapshotRows = [];
  const teamSnapshotRows = [];
  const playerUpdateRows = [];

  for (const teamInput of input.teams) {
    const abbreviation = String(teamInput.abbreviation ?? "").toUpperCase();
    const team = teamByAbbreviation.get(abbreviation);

    if (!team) {
      throw new Error(`No Supabase team exists for ${abbreviation}.`);
    }

    teamSnapshotRows.push({
      league_id: null,
      team_id: team.id,
      source: input.source ?? "maddenratings",
      source_priority: 100,
      game_version: input.gameVersion,
      overall: teamInput.overall ?? null,
      offense: null,
      defense: null,
      attributes: {},
      source_payload: {
        slug: teamInput.slug,
        profileUrl: teamInput.profileUrl,
      },
      captured_at: input.capturedAt ?? startedAt,
    });

    for (const playerInput of teamInput.players ?? []) {
      const normalizedName = normalizeName(playerInput.name);
      const position = playerInput.position || null;
      const identityKey = `${normalizedName}|${position ?? ""}|${team.id}`;
      const externalId = String(playerInput.externalId);

      let playerId = aliasToPlayerId.get(externalId);

      if (!playerId) {
        playerId = identityToPlayerId.get(identityKey);
      }

      if (!playerId) {
        playerId = randomUUID();
        playerRows.push({
          id: playerId,
          canonical_name: playerInput.name,
          normalized_name: normalizedName,
          primary_position: position,
          baseline_team_id: team.id,
          updated_at: startedAt,
        });
        identityToPlayerId.set(identityKey, playerId);
      } else {
        playerUpdateRows.push({
          id: playerId,
          canonical_name: playerInput.name,
          normalized_name: normalizedName,
          primary_position: position,
          baseline_team_id: team.id,
          updated_at: startedAt,
        });
      }

      if (!aliasToPlayerId.has(externalId)) {
        aliasRows.push({
          player_id: playerId,
          source: input.source ?? "maddenratings",
          external_id: externalId,
        });
        aliasToPlayerId.set(externalId, playerId);
      }

      snapshotRows.push({
        player_id: playerId,
        league_id: null,
        team_id: team.id,
        source: input.source ?? "maddenratings",
        source_priority: 100,
        game_version: input.gameVersion,
        overall: playerInput.overall ?? null,
        jersey_number: playerInput.jerseyNumber ?? null,
        position,
        archetype: playerInput.archetype ?? null,
        dev_trait: playerInput.devTrait ?? null,
        attributes: {
          generalRating: playerInput.generalRating ?? null,
          totalRating: playerInput.totalRating ?? null,
        },
        source_payload: playerInput,
        captured_at: input.capturedAt ?? startedAt,
      });
    }
  }

  for (const batch of chunks(playerRows)) {
    if (!batch.length) continue;
    const { error } = await supabase.from("madden_players").insert(batch);
    if (error) throw error;
  }

  for (const batch of chunks(playerUpdateRows)) {
    if (!batch.length) continue;
    const { error } = await supabase
      .from("madden_players")
      .upsert(batch, { onConflict: "id" });
    if (error) throw error;
  }

  for (const batch of chunks(aliasRows)) {
    if (!batch.length) continue;
    const { error } = await supabase
      .from("madden_player_external_ids")
      .upsert(batch, { onConflict: "source,external_id" });
    if (error) throw error;
  }

  const { error: deletePlayerSnapshotsError } = await supabase
    .from("madden_player_snapshots")
    .delete()
    .eq("source", input.source ?? "maddenratings")
    .eq("game_version", input.gameVersion)
    .is("league_id", null);

  if (deletePlayerSnapshotsError) throw deletePlayerSnapshotsError;

  const { error: deleteTeamSnapshotsError } = await supabase
    .from("madden_team_snapshots")
    .delete()
    .eq("source", input.source ?? "maddenratings")
    .eq("game_version", input.gameVersion)
    .is("league_id", null);

  if (deleteTeamSnapshotsError) throw deleteTeamSnapshotsError;

  for (const batch of chunks(snapshotRows)) {
    const { error } = await supabase.from("madden_player_snapshots").insert(batch);
    if (error) throw error;
  }

  for (const batch of chunks(teamSnapshotRows)) {
    const { error } = await supabase.from("madden_team_snapshots").insert(batch);
    if (error) throw error;
  }

  const completedAt = new Date().toISOString();
  const { error: runCompleteError } = await supabase
    .from("madden_import_runs")
    .update({
      status: "completed",
      player_count: snapshotRows.length,
      team_count: teamSnapshotRows.length,
      completed_at: completedAt,
      details: {
        inputPath,
        capturedAt: input.capturedAt ?? null,
        newPlayers: playerRows.length,
        updatedPlayers: playerUpdateRows.length,
        newAliases: aliasRows.length,
      },
    })
    .eq("id", importRunId);

  if (runCompleteError) throw runCompleteError;

  console.log(
    `Imported ${snapshotRows.length} players across ${teamSnapshotRows.length} teams.`,
  );
  console.log("Baseline data is active. Future EA franchise snapshots will override it automatically.");
} catch (error) {
  await supabase
    .from("madden_import_runs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      details: {
        inputPath,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    .eq("id", importRunId);

  throw error;
}
