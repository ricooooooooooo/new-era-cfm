import { attachSleeperHeadshots } from "@/lib/nfl/sleeper-players";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CurrentMaddenPlayer,
  MaddenDataSource,
  MaddenPlayerSnapshot,
} from "./types";

type PlayerRow = {
  id: string;
  canonical_name: string;
  normalized_name: string;
  primary_position: string | null;
  baseline_team_id: string | null;
};

type TeamRow = {
  id: string;
  city: string | null;
  name: string;
  abbreviation: string;
};

type GetPlayersOptions = {
  leagueId?: string | null;
  teamAbbreviation?: string | null;
  search?: string | null;
  playerId?: string | null;
  limit?: number;
};

const PAGE_SIZE = 1000;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function loadPlayers(playerId: string | null) {
  const supabase = createServerSupabaseClient();
  const rows: PlayerRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from("madden_players")
      .select(
        "id, canonical_name, normalized_name, primary_position, baseline_team_id",
      );

    if (playerId) {
      query = query.eq("id", playerId);
    } else {
      query = query.order("canonical_name", { ascending: true });
    }

    const { data, error } = await query.range(
      from,
      from + PAGE_SIZE - 1,
    );

    if (error) throw error;

    const page = (data ?? []) as PlayerRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE || playerId) break;
  }

  return rows;
}

async function loadSnapshots(
  leagueId: string | null,
  playerId: string | null,
) {
  const supabase = createServerSupabaseClient();
  const rows: MaddenPlayerSnapshot[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from("madden_player_snapshots")
      .select(
        "id, player_id, league_id, team_id, source, source_priority, game_version, overall, jersey_number, position, archetype, dev_trait, attributes, source_payload, captured_at",
      )
      .or(
        leagueId
          ? `league_id.is.null,league_id.eq.${leagueId}`
          : "league_id.is.null",
      )
      .order("captured_at", { ascending: false });

    if (playerId) {
      query = query.eq("player_id", playerId);
    }

    const { data, error } = await query.range(
      from,
      from + PAGE_SIZE - 1,
    );

    if (error) throw error;

    const page = (data ?? []) as MaddenPlayerSnapshot[];
    rows.push(
      ...page.map((row) => ({
        ...row,
        attributes: asRecord(row.attributes),
        source_payload: asRecord(row.source_payload),
      })),
    );

    if (page.length < PAGE_SIZE || playerId) break;
  }

  return rows;
}

async function loadTeams() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, city, name, abbreviation");

  if (error) throw error;
  return (data ?? []) as TeamRow[];
}

function snapshotRank(snapshot: MaddenPlayerSnapshot) {
  return (
    snapshot.source_priority * 10_000_000_000 +
    Date.parse(snapshot.captured_at)
  );
}

function chooseLatestBySource(snapshots: MaddenPlayerSnapshot[]) {
  const result = new Map<string, MaddenPlayerSnapshot>();

  for (const snapshot of snapshots) {
    const key = `${snapshot.player_id}:${snapshot.source}:${snapshot.league_id ?? "baseline"}`;
    const current = result.get(key);

    if (!current || snapshotRank(snapshot) > snapshotRank(current)) {
      result.set(key, snapshot);
    }
  }

  return result;
}

function mergePlayerSnapshots(
  player: PlayerRow,
  snapshots: MaddenPlayerSnapshot[],
  leagueId: string | null,
): CurrentMaddenPlayer {
  const baseline = snapshots.find(
    (snapshot) =>
      snapshot.source === "maddenratings" &&
      snapshot.league_id === null,
  );

  const candidates = snapshots.filter((snapshot) => {
    if (snapshot.source === "maddenratings") return false;
    if (snapshot.league_id === null) {
      return snapshot.source === "manual";
    }

    return Boolean(
      leagueId &&
        snapshot.league_id === leagueId,
    );
  });

  candidates.sort((a, b) => snapshotRank(b) - snapshotRank(a));

  const live = candidates[0] ?? null;
  const active = live ?? baseline ?? null;

  return {
    id: player.id,
    name: player.canonical_name,
    normalizedName: player.normalized_name,
    teamId: live
      ? live.team_id
      : baseline?.team_id ?? player.baseline_team_id,
    teamAbbreviation: null,
    teamName: null,
    position:
      live?.position ??
      baseline?.position ??
      player.primary_position ??
      null,
    jerseyNumber:
      live?.jersey_number ??
      baseline?.jersey_number ??
      null,
    overall:
      live?.overall ??
      baseline?.overall ??
      null,
    archetype:
      live?.archetype ??
      baseline?.archetype ??
      null,
    devTrait:
      live?.dev_trait ??
      baseline?.dev_trait ??
      null,
    attributes: {
      ...(baseline?.attributes ?? {}),
      ...(live?.attributes ?? {}),
    },
    source:
      (active?.source as MaddenDataSource | undefined) ??
      null,
    gameVersion: active?.game_version ?? null,
    capturedAt: active?.captured_at ?? null,
    hasFranchiseData: live?.source === "ea_franchise",
    sleeperPlayerId: null,
    headshotUrl: null,
  };
}

export async function getCurrentMaddenPlayers(
  options: GetPlayersOptions = {},
): Promise<CurrentMaddenPlayer[]> {
  const leagueId = options.leagueId ?? null;
  const playerId = options.playerId?.trim() || null;
  const limit = Math.min(
    Math.max(options.limit ?? 100, 1),
    3000,
  );
  const search =
    options.search?.trim().toLowerCase() ?? "";
  const teamAbbreviation =
    options.teamAbbreviation?.trim().toUpperCase() ?? "";

  const [players, snapshots, teams] = await Promise.all([
    loadPlayers(playerId),
    loadSnapshots(leagueId, playerId),
    loadTeams(),
  ]);

  const teamMap = new Map(
    teams.map((team) => [team.id, team]),
  );
  const latestSnapshots = chooseLatestBySource(snapshots);
  const snapshotsByPlayer = new Map<
    string,
    MaddenPlayerSnapshot[]
  >();

  for (const snapshot of latestSnapshots.values()) {
    const group =
      snapshotsByPlayer.get(snapshot.player_id) ?? [];
    group.push(snapshot);
    snapshotsByPlayer.set(snapshot.player_id, group);
  }

  const resolvedPlayers = players
    .map((player) =>
      mergePlayerSnapshots(
        player,
        snapshotsByPlayer.get(player.id) ?? [],
        leagueId,
      ),
    )
    .map((player) => {
      const team = player.teamId
        ? teamMap.get(player.teamId)
        : null;

      return {
        ...player,
        teamAbbreviation:
          team?.abbreviation ?? null,
        teamName: team
          ? [team.city, team.name]
              .filter(Boolean)
              .join(" ")
          : null,
      };
    })
    .filter((player) => {
      if (
        teamAbbreviation &&
        player.teamAbbreviation?.toUpperCase() !==
          teamAbbreviation
      ) {
        return false;
      }

      if (
        search &&
        !`${player.name} ${player.position ?? ""} ${player.teamName ?? ""}`
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const overallDifference =
        (b.overall ?? -1) -
        (a.overall ?? -1);

      return (
        overallDifference ||
        a.name.localeCompare(b.name)
      );
    })
    .slice(0, limit);

  return attachSleeperHeadshots(resolvedPlayers);
}

export async function getCurrentMaddenPlayerById(
  playerId: string,
  leagueId: string | null = null,
): Promise<CurrentMaddenPlayer | null> {
  const players = await getCurrentMaddenPlayers({
    playerId,
    leagueId,
    limit: 1,
  });

  return players[0] ?? null;
}
