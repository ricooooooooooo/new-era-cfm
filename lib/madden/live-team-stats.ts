import { supabaseAdmin } from "@/lib/supabase-admin";

type Row = Record<string, unknown>;

function record(value: unknown): Row {
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

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function str(value: unknown) {
  return String(value ?? "").trim();
}

export type PlayerStatLine = {
  rosterId: string;
  name: string;

  passAtt: number;
  passComp: number;
  passYds: number;
  passTDs: number;
  passInts: number;

  rushAtt: number;
  rushYds: number;
  rushTDs: number;
  rushFum: number;

  recCatches: number;
  recYds: number;
  recTDs: number;
  recDrops: number;

  tackles: number;
  sacks: number;
  interceptions: number;
  forcedFumbles: number;
  fumbleRecoveries: number;
  deflections: number;
};

export type LiveTeamStats = {
  season: number;
  currentWeek: number;

  team: {
    abbreviation: string;
    eaTeamId: number;
  };

  record: {
    wins: number;
    losses: number;
    ties: number;
  };

  teamStats: {
    pointsPerGame: number;
    pointsAllowedPerGame: number;
    passingYards: number;
    rushingYards: number;
    totalYards: number;
    passingTouchdowns: number;
    rushingTouchdowns: number;
    giveaways: number;
    takeaways: number;
    sacks: number;
    sacksAllowed: number;
  };

  leaders: {
    passing: PlayerStatLine[];
    rushing: PlayerStatLine[];
    receiving: PlayerStatLine[];
    sacks: PlayerStatLine[];
    interceptions: PlayerStatLine[];
    tackles: PlayerStatLine[];
  };
};

function playerFor(
  map: Map<string, PlayerStatLine>,
  row: Row,
) {
  const rosterId = str(row.rosterId);

  if (!rosterId) return null;

  let player = map.get(rosterId);

  if (!player) {
    player = {
      rosterId,
      name: str(row.fullName) || `Player ${rosterId}`,

      passAtt: 0,
      passComp: 0,
      passYds: 0,
      passTDs: 0,
      passInts: 0,

      rushAtt: 0,
      rushYds: 0,
      rushTDs: 0,
      rushFum: 0,

      recCatches: 0,
      recYds: 0,
      recTDs: 0,
      recDrops: 0,

      tackles: 0,
      sacks: 0,
      interceptions: 0,
      forcedFumbles: 0,
      fumbleRecoveries: 0,
      deflections: 0,
    };

    map.set(rosterId, player);
  }

  return player;
}

export async function getLiveTeamStats(
  abbreviation: string,
): Promise<LiveTeamStats | null> {
  const leagueResult = await supabaseAdmin
    .from("leagues")
    .select("id, season, current_week")
    .eq("slug", "new-era-cfm")
    .maybeSingle();

  if (leagueResult.error) throw leagueResult.error;
  if (!leagueResult.data) return null;

  const league = leagueResult.data;
  const season = Number(league.season ?? 1);
  const currentWeek = Number(league.current_week ?? 1);

  const teamResult = await supabaseAdmin
    .from("teams")
    .select("id, abbreviation")
    .eq("league_id", league.id)
    .eq("abbreviation", abbreviation.toUpperCase())
    .maybeSingle();

  if (teamResult.error) throw teamResult.error;
  if (!teamResult.data) return null;

  const snapshotResult = await supabaseAdmin
    .from("madden_team_snapshots")
    .select("attributes, captured_at")
    .eq("league_id", league.id)
    .eq("team_id", teamResult.data.id)
    .eq("source", "ea_franchise")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotResult.error) throw snapshotResult.error;

  const attributes = record(snapshotResult.data?.attributes);
  const eaTeamId = num(attributes.eaTeamId);

  if (!eaTeamId) return null;

  const categories = [
    "passing",
    "rushing",
    "receiving",
    "defense",
    "team-stats",
  ];

  const exportTypes: string[] = [];

  for (let week = 1; week <= currentWeek; week++) {
    for (const category of categories) {
      exportTypes.push(`week-${week}-${category}`);
    }
  }

  const syncResult = await supabaseAdmin
    .from("league_syncs")
    .select("export_type, payload, received_at")
    .eq("source", "ea_franchise")
    .in("export_type", exportTypes)
    .order("received_at", { ascending: false });

  if (syncResult.error) throw syncResult.error;

  const latest = new Map<string, Row>();

  for (const sync of syncResult.data ?? []) {
    const type = str(sync.export_type);

    if (!type || latest.has(type)) continue;

    latest.set(type, record(sync.payload));
  }

  const players = new Map<string, PlayerStatLine>();

  let passingYards = 0;
  let rushingYards = 0;
  let totalYards = 0;
  let passingTouchdowns = 0;
  let rushingTouchdowns = 0;
  let giveaways = 0;
  let takeaways = 0;
  let sacks = 0;
  let sacksAllowed = 0;

  let latestTeamRow: Row | null = null;

  for (let week = 1; week <= currentWeek; week++) {
    const passingPayload =
      latest.get(`week-${week}-passing`);

    for (
      const row of rows(
        passingPayload?.playerPassingStatInfoList,
      )
    ) {
      if (num(row.teamId) !== eaTeamId) continue;

      const player = playerFor(players, row);
      if (!player) continue;

      player.passAtt += num(row.passAtt);
      player.passComp += num(row.passComp);
      player.passYds += num(row.passYds);
      player.passTDs += num(row.passTDs);
      player.passInts += num(row.passInts);
    }

    const rushingPayload =
      latest.get(`week-${week}-rushing`);

    for (
      const row of rows(
        rushingPayload?.playerRushingStatInfoList,
      )
    ) {
      if (num(row.teamId) !== eaTeamId) continue;

      const player = playerFor(players, row);
      if (!player) continue;

      player.rushAtt += num(row.rushAtt);
      player.rushYds += num(row.rushYds);
      player.rushTDs += num(row.rushTDs);
      player.rushFum += num(row.rushFum);
    }

    const receivingPayload =
      latest.get(`week-${week}-receiving`);

    for (
      const row of rows(
        receivingPayload?.playerReceivingStatInfoList,
      )
    ) {
      if (num(row.teamId) !== eaTeamId) continue;

      const player = playerFor(players, row);
      if (!player) continue;

      player.recCatches += num(row.recCatches);
      player.recYds += num(row.recYds);
      player.recTDs += num(row.recTDs);
      player.recDrops += num(row.recDrops);
    }

    const defensePayload =
      latest.get(`week-${week}-defense`);

    for (
      const row of rows(
        defensePayload?.playerDefensiveStatInfoList,
      )
    ) {
      if (num(row.teamId) !== eaTeamId) continue;

      const player = playerFor(players, row);
      if (!player) continue;

      player.tackles += num(row.defTotalTackles);
      player.sacks += num(row.defSacks);
      player.interceptions += num(row.defInts);
      player.forcedFumbles += num(row.defForcedFum);
      player.fumbleRecoveries += num(row.defFumRec);
      player.deflections += num(row.defDeflections);
    }

    const teamPayload =
      latest.get(`week-${week}-team-stats`);

    const teamRow = rows(
      teamPayload?.teamStatInfoList,
    ).find((row) => num(row.teamId) === eaTeamId);

    if (teamRow) {
      latestTeamRow = teamRow;

      passingYards += num(teamRow.offPassYds);
      rushingYards += num(teamRow.offRushYds);
      totalYards += num(teamRow.offTotalYds);
      passingTouchdowns += num(teamRow.offPassTDs);
      rushingTouchdowns += num(teamRow.offRushTDs);
      giveaways += num(teamRow.tOGiveaways);
      takeaways += num(teamRow.tOTakeaways);
      sacks += num(teamRow.defSacks);
      sacksAllowed += num(teamRow.offSacks);
    }
  }

  const allPlayers = [...players.values()];

  const top = (
    selector: (player: PlayerStatLine) => number,
    count = 5,
  ) =>
    [...allPlayers]
      .filter((player) => selector(player) > 0)
      .sort((a, b) => selector(b) - selector(a))
      .slice(0, count);

  return {
    season,
    currentWeek,

    team: {
      abbreviation: abbreviation.toUpperCase(),
      eaTeamId,
    },

    record: {
      wins: num(latestTeamRow?.totalWins),
      losses: num(latestTeamRow?.totalLosses),
      ties: num(latestTeamRow?.totalTies),
    },

    teamStats: {
      pointsPerGame: num(latestTeamRow?.offPtsPerGame),
      pointsAllowedPerGame: num(
        latestTeamRow?.defPtsPerGame,
      ),
      passingYards,
      rushingYards,
      totalYards,
      passingTouchdowns,
      rushingTouchdowns,
      giveaways,
      takeaways,
      sacks,
      sacksAllowed,
    },

    leaders: {
      passing: top((player) => player.passYds),
      rushing: top((player) => player.rushYds),
      receiving: top((player) => player.recYds),
      sacks: top((player) => player.sacks),
      interceptions: top(
        (player) => player.interceptions,
      ),
      tackles: top((player) => player.tackles),
    },
  };
}
