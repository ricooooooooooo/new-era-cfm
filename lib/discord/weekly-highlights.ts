import { teams as STATIC_TEAMS } from "@/app/data/teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Row = Record<string, unknown>;

type DiscordChannel = {
  id: string;
  name: string;
  type: number;
};

type DiscordEmoji = {
  id: string;
  name: string;
};

type DiscordMessage = {
  id: string;
  channel_id: string;
};

type TeamContext = {
  id: string;
  abbreviation: string;
  city: string;
  name: string;
  division: string;
  conference: "AFC" | "NFC";
  ownerDiscordId: string | null;
  eaTeamId: number | null;
};

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

function normalized(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

async function discordRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token =
    process.env.DISCORD_BOT_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "DISCORD_BOT_TOKEN is not configured.",
    );
  }

  const response = await fetch(
    `https://discord.com/api/v10${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bot ${token}`,
        ...(init.body
          ? { "content-type": "application/json" }
          : {}),
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    },
  );

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Discord ${response.status}: ${text.slice(
        0,
        700,
      )}`,
    );
  }

  return JSON.parse(text) as T;
}

async function resolveChannels() {
  const guildId =
    process.env.DISCORD_GUILD_ID?.trim();

  if (!guildId) {
    throw new Error(
      "DISCORD_GUILD_ID is not configured.",
    );
  }

  const channels =
    await discordRequest<DiscordChannel[]>(
      `/guilds/${guildId}/channels`,
    );

  const textChannels = channels.filter(
    (channel) => channel.type === 0,
  );

  const gotwMatch = textChannels.find(
    (channel) => {
      const name = normalized(channel.name);

      return (
        name.includes("gotw") ||
        name.includes("gameoftheweek")
      );
    },
  );

  const potwMatch = textChannels.find(
    (channel) => {
      const name = normalized(channel.name);

      return (
        name.includes("potw") ||
        name.includes("playeroftheweek") ||
        name.includes("playersoftheweek")
      );
    },
  );

  let gotwId =
    process.env.DISCORD_GOTW_CHANNEL_ID?.trim() ||
    "1531408027201306667";

  let potwId =
    process.env.DISCORD_POTW_CHANNEL_ID?.trim() ||
    "1531408027201306668";

  // If you use one combined GOTW/POTW channel,
  // both automations can use that same channel.
  if (!gotwId && potwId) gotwId = potwId;
  if (!potwId && gotwId) potwId = gotwId;

  if (!gotwId || !potwId) {
    throw new Error(
      "Could not auto-detect a GOTW/POTW Discord channel. Include GOTW or POTW in the channel name.",
    );
  }

  return {
    guildId,
    gotwId,
    potwId,
    gotwName:
      textChannels.find(
        (channel) => channel.id === gotwId,
      )?.name ?? null,
    potwName:
      textChannels.find(
        (channel) => channel.id === potwId,
      )?.name ?? null,
  };
}

async function markerExists(marker: string) {
  const result = await supabaseAdmin
    .from("league_syncs")
    .select("id")
    .eq("source", "new_era_weekly")
    .eq("export_type", marker)
    .limit(1);

  if (result.error) throw result.error;

  return Boolean(result.data?.length);
}

async function writeMarker(
  marker: string,
  payload: Row,
) {
  const result = await supabaseAdmin
    .from("league_syncs")
    .insert({
      source: "new_era_weekly",
      export_type: marker,
      status: "received",
      payload,
      payload_type: "object",
      top_level_keys: Object.keys(payload),
      item_count: null,
      request_headers: {
        automation: "weekly-highlights",
      },
      duration_ms: 0,
    });

  if (result.error) throw result.error;
}

async function loadContexts(
  leagueId: string,
) {
  const teamsResult = await supabaseAdmin
    .from("teams")
    .select(
      "id, city, name, abbreviation, owner_member_id",
    )
    .eq("league_id", leagueId);

  if (teamsResult.error) throw teamsResult.error;

  const ownerIds = [
    ...new Set(
      (teamsResult.data ?? [])
        .map((team) => team.owner_member_id)
        .filter(
          (value): value is string =>
            Boolean(value),
        ),
    ),
  ];

  const membersResult = ownerIds.length
    ? await supabaseAdmin
        .from("members")
        .select("id, discord_id")
        .in("id", ownerIds)
    : { data: [], error: null };

  if (membersResult.error) {
    throw membersResult.error;
  }

  const discordByMember = new Map(
    (membersResult.data ?? []).map((member) => [
      String(member.id),
      str(member.discord_id),
    ]),
  );

  const snapshotsResult = await supabaseAdmin
    .from("madden_team_snapshots")
    .select("team_id, attributes, captured_at")
    .eq("league_id", leagueId)
    .eq("source", "ea_franchise")
    .order("captured_at", {
      ascending: false,
    });

  if (snapshotsResult.error) {
    throw snapshotsResult.error;
  }

  const latestSnapshot = new Map<string, Row>();

  for (
    const snapshot of
      snapshotsResult.data ?? []
  ) {
    const id = String(snapshot.team_id);

    if (!latestSnapshot.has(id)) {
      latestSnapshot.set(
        id,
        record(snapshot.attributes),
      );
    }
  }

  const contexts: TeamContext[] = (
    teamsResult.data ?? []
  ).map((team) => {
    const abbreviation = str(
      team.abbreviation,
    ).toUpperCase();

    const staticTeam = STATIC_TEAMS.find(
      (candidate) =>
        candidate.short === abbreviation,
    );

    const attributes =
      latestSnapshot.get(String(team.id)) ??
      {};

    return {
      id: String(team.id),
      abbreviation,
      city: str(team.city),
      name: str(team.name),
      division:
        staticTeam?.division ||
        str(attributes.division),
      conference:
        staticTeam?.conference ??
        (str(attributes.division).startsWith(
          "NFC",
        )
          ? "NFC"
          : "AFC"),
      ownerDiscordId:
        team.owner_member_id
          ? discordByMember.get(
              String(team.owner_member_id),
            ) || null
          : null,
      eaTeamId:
        num(attributes.eaTeamId) || null,
    };
  });

  return {
    all: contexts,
    byId: new Map(
      contexts.map((team) => [team.id, team]),
    ),
    byAbbr: new Map(
      contexts.map((team) => [
        team.abbreviation,
        team,
      ]),
    ),
    byEaId: new Map(
      contexts
        .filter((team) => team.eaTeamId)
        .map((team) => [
          Number(team.eaTeamId),
          team,
        ]),
    ),
  };
}

async function latestWeekExports(
  week: number,
) {
  const types = [
    `week-${week}-passing`,
    `week-${week}-rushing`,
    `week-${week}-receiving`,
    `week-${week}-defense`,
  ];

  const result = await supabaseAdmin
    .from("league_syncs")
    .select("export_type, payload, received_at")
    .eq("source", "ea_franchise")
    .in("export_type", types)
    .order("received_at", {
      ascending: false,
    });

  if (result.error) throw result.error;

  const latest = new Map<string, Row>();

  for (const entry of result.data ?? []) {
    const type = str(entry.export_type);

    if (!latest.has(type)) {
      latest.set(
        type,
        record(entry.payload),
      );
    }
  }

  return latest;
}

type AwardCandidate = {
  rosterId: string;
  name: string;
  teamId: number;
  score: number;

  passYds: number;
  passTDs: number;
  passInts: number;

  rushYds: number;
  rushTDs: number;

  recCatches: number;
  recYds: number;
  recTDs: number;

  tackles: number;
  sacks: number;
  interceptions: number;
  forcedFumbles: number;
  fumbleRecoveries: number;
  defensiveTDs: number;
};

function awardPlayer(
  map: Map<string, AwardCandidate>,
  row: Row,
) {
  const rosterId = str(row.rosterId);

  if (!rosterId) return null;

  let player = map.get(rosterId);

  if (!player) {
    player = {
      rosterId,
      name: str(row.fullName),
      teamId: num(row.teamId),
      score: 0,

      passYds: 0,
      passTDs: 0,
      passInts: 0,

      rushYds: 0,
      rushTDs: 0,

      recCatches: 0,
      recYds: 0,
      recTDs: 0,

      tackles: 0,
      sacks: 0,
      interceptions: 0,
      forcedFumbles: 0,
      fumbleRecoveries: 0,
      defensiveTDs: 0,
    };

    map.set(rosterId, player);
  }

  return player;
}

async function hydratePlayerNames(
  winners: AwardCandidate[],
) {
  const rosterIds = [
    ...new Set(
      winners.map((winner) => winner.rosterId),
    ),
  ];

  if (!rosterIds.length) return;

  const externalResult = await supabaseAdmin
    .from("madden_player_external_ids")
    .select("player_id, external_id")
    .eq("source", "ea_franchise")
    .in("external_id", rosterIds);

  if (externalResult.error) return;

  const playerIds = [
    ...new Set(
      (externalResult.data ?? []).map(
        (entry) => String(entry.player_id),
      ),
    ),
  ];

  if (!playerIds.length) return;

  const playerResult = await supabaseAdmin
    .from("madden_players")
    .select("id, canonical_name")
    .in("id", playerIds);

  if (playerResult.error) return;

  const nameByPlayer = new Map(
    (playerResult.data ?? []).map((player) => [
      String(player.id),
      str(player.canonical_name),
    ]),
  );

  const nameByExternal = new Map(
    (externalResult.data ?? []).map((entry) => [
      String(entry.external_id),
      nameByPlayer.get(
        String(entry.player_id),
      ) ?? "",
    ]),
  );

  for (const winner of winners) {
    winner.name =
      nameByExternal.get(winner.rosterId) ||
      winner.name;
  }
}


type SleeperPlayerProfile = {
  player_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  team?: string;
};

let sleeperPlayerCache:
  | Record<string, SleeperPlayerProfile>
  | null = null;

async function loadSleeperPlayers() {
  if (sleeperPlayerCache) {
    return sleeperPlayerCache;
  }

  const response = await fetch(
    "https://api.sleeper.app/v1/players/nfl",
    {
      cache: "force-cache",
      next: {
        revalidate: 86400,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Sleeper player lookup failed: ${response.status}`,
    );
  }

  sleeperPlayerCache =
    (await response.json()) as Record<
      string,
      SleeperPlayerProfile
    >;

  return sleeperPlayerCache;
}

async function resolvePlayerHeadshot(
  playerName: string,
  teamAbbreviation: string | null,
) {
  try {
    const players = await loadSleeperPlayers();

    const targetName = normalized(playerName);
    const targetTeam =
      teamAbbreviation?.toUpperCase() ?? null;

    let fallback:
      | [string, SleeperPlayerProfile]
      | null = null;

    for (const [playerId, player] of Object.entries(players)) {
      const fullName =
        player.full_name ||
        `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim();

      if (normalized(fullName) !== targetName) {
        continue;
      }

      if (!fallback) {
        fallback = [playerId, player];
      }

      if (
        targetTeam &&
        player.team?.toUpperCase() === targetTeam
      ) {
        return `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`;
      }
    }

    if (fallback) {
      return `https://sleepercdn.com/content/nfl/players/${fallback[0]}.jpg`;
    }

    return null;
  } catch (error) {
    console.error(
      "POTW headshot lookup failed:",
      error,
    );

    return null;
  }
}

function weeklyTeamLogo(abbreviation: string) {
  return `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${abbreviation}`;
}

async function postPotw({
  leagueId,
  season,
  currentWeek,
  channelId,
  contexts,
}: {
  leagueId: string;
  season: number;
  currentWeek: number;
  channelId: string;
  contexts: Awaited<
    ReturnType<typeof loadContexts>
  >;
}) {
  const week = currentWeek - 1;

  if (week < 1) {
    return {
      action: "skip",
      reason: "No previous week.",
    };
  }

  const marker =
    `season-${season}-week-${week}-potw-posted`;

  if (await markerExists(marker)) {
    return {
      action: "already_posted",
      week,
    };
  }

  const exports =
    await latestWeekExports(week);

  const offense =
    new Map<string, AwardCandidate>();

  const defense =
    new Map<string, AwardCandidate>();

  for (
    const row of rows(
      exports.get(`week-${week}-passing`)
        ?.playerPassingStatInfoList,
    )
  ) {
    const player = awardPlayer(
      offense,
      row,
    );

    if (!player) continue;

    player.passYds += num(row.passYds);
    player.passTDs += num(row.passTDs);
    player.passInts += num(row.passInts);

    player.score +=
      num(row.passYds) * 0.1 +
      num(row.passTDs) * 30 -
      num(row.passInts) * 20;
  }

  for (
    const row of rows(
      exports.get(`week-${week}-rushing`)
        ?.playerRushingStatInfoList,
    )
  ) {
    const player = awardPlayer(
      offense,
      row,
    );

    if (!player) continue;

    player.rushYds += num(row.rushYds);
    player.rushTDs += num(row.rushTDs);

    player.score +=
      num(row.rushYds) * 0.2 +
      num(row.rushTDs) * 35 -
      num(row.rushFum) * 15;
  }

  for (
    const row of rows(
      exports.get(`week-${week}-receiving`)
        ?.playerReceivingStatInfoList,
    )
  ) {
    const player = awardPlayer(
      offense,
      row,
    );

    if (!player) continue;

    player.recCatches += num(row.recCatches);
    player.recYds += num(row.recYds);
    player.recTDs += num(row.recTDs);

    player.score +=
      num(row.recYds) * 0.2 +
      num(row.recTDs) * 35 +
      num(row.recCatches) * 2 -
      num(row.recDrops) * 4;
  }

  for (
    const row of rows(
      exports.get(`week-${week}-defense`)
        ?.playerDefensiveStatInfoList,
    )
  ) {
    const player = awardPlayer(
      defense,
      row,
    );

    if (!player) continue;

    player.tackles +=
      num(row.defTotalTackles);
    player.sacks += num(row.defSacks);
    player.interceptions += num(row.defInts);
    player.forcedFumbles +=
      num(row.defForcedFum);
    player.fumbleRecoveries +=
      num(row.defFumRec);
    player.defensiveTDs += num(row.defTDs);

    player.score +=
      num(row.defTotalTackles) * 2 +
      num(row.defSacks) * 15 +
      num(row.defInts) * 25 +
      num(row.defForcedFum) * 15 +
      num(row.defFumRec) * 10 +
      num(row.defDeflections) * 5 +
      num(row.defTDs) * 40;
  }

  function best(
    map: Map<string, AwardCandidate>,
    conference: "AFC" | "NFC",
  ) {
    return [...map.values()]
      .filter(
        (player) =>
          contexts.byEaId.get(player.teamId)
            ?.conference === conference,
      )
      .sort((a, b) => b.score - a.score)[0];
  }

  const awards = [
    {
      label: "AFC Offensive POTW",
      player: best(offense, "AFC"),
    },
    {
      label: "AFC Defensive POTW",
      player: best(defense, "AFC"),
    },
    {
      label: "NFC Offensive POTW",
      player: best(offense, "NFC"),
    },
    {
      label: "NFC Defensive POTW",
      player: best(defense, "NFC"),
    },
  ].filter(
    (
      award,
    ): award is {
      label: string;
      player: AwardCandidate;
    } => Boolean(award.player),
  );

  if (!awards.length) {
    return {
      action: "skip",
      reason: `No Week ${week} stats found.`,
    };
  }

  await hydratePlayerNames(
    awards.map((award) => award.player),
  );

  function offensiveLine(
    player: AwardCandidate,
  ) {
    const parts: string[] = [];

    if (player.passYds) {
      parts.push(
        `${player.passYds} PASS YDS`,
        `${player.passTDs} PASS TD`,
      );

      if (player.passInts) {
        parts.push(`${player.passInts} INT`);
      }
    }

    if (player.rushYds) {
      parts.push(
        `${player.rushYds} RUSH YDS`,
        `${player.rushTDs} RUSH TD`,
      );
    }

    if (player.recYds) {
      parts.push(
        `${player.recCatches} REC`,
        `${player.recYds} REC YDS`,
        `${player.recTDs} REC TD`,
      );
    }

    return parts.join(" • ");
  }

  function defensiveLine(
    player: AwardCandidate,
  ) {
    return [
      `${player.tackles} TKL`,
      `${player.sacks.toFixed(1)} SACK`,
      `${player.interceptions} INT`,
      `${player.forcedFumbles} FF`,
      `${player.defensiveTDs} TD`,
    ].join(" • ");
  }

  const ownerIds = [
    ...new Set(
      awards
        .map((award) =>
          contexts.byEaId.get(
            award.player.teamId,
          )?.ownerDiscordId,
        )
        .filter(
          (id): id is string => Boolean(id),
        ),
    ),
  ];

  const ownerMentions = ownerIds.map(
    (id) => `<@${id}>`,
  );


  const awardEmbeds = await Promise.all(
    awards.map(async (award) => {
      const team =
        contexts.byEaId.get(
          award.player.teamId,
        );

      const defensive =
        award.label.includes("Defensive");

      const headshot =
        await resolvePlayerHeadshot(
          award.player.name,
          team?.abbreviation ?? null,
        );

      const thumbnail =
        headshot ||
        (team
          ? weeklyTeamLogo(team.abbreviation)
          : null);

      const statLine = defensive
        ? defensiveLine(award.player)
        : offensiveLine(award.player);

      return {
        title:
          `🏆 ${award.label}`,
        description:
          `**${award.player.name}** — **${team?.abbreviation ?? "?"}**\n` +
          `${statLine}\n\n` +
          `🎁 **Reward:** +2 NP Upgrade`,
        color:
          defensive
            ? 0x2563eb
            : 0x7c3aed,
        ...(thumbnail
          ? {
              thumbnail: {
                url: thumbnail,
              },
            }
          : {}),
        footer: {
          text:
            `New Era CFM • Season ${season} • Week ${week}`,
        },
      };
    }),
  );

  const message =
    await discordRequest<DiscordMessage>(
      `/channels/${channelId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content: ownerMentions.length
            ? `${ownerMentions.join(
                " ",
              )}\n🏆 Your player won **Player of the Week** — claim your **+2 NP (non-physical) reward**.`
            : "🏆 NEW ERA Players of the Week",
          allowed_mentions: {
            parse: [],
            users: ownerIds,
          },
          embeds: [
            {
              title:
                `🏆 NEW ERA WEEK ${week} PLAYERS OF THE WEEK`,
              description:
                "Four conference award winners. Each winning owner earns a +2 NP upgrade.",
              color: 0xf59e0b,
            },
            ...awardEmbeds,
          ],
        }),
      },
    );

  await writeMarker(marker, {
    messageId: message.id,
    channelId,
    season,
    week,
    awards,
  });

  return {
    action: "posted",
    week,
    messageId: message.id,
    winners: awards.map((award) => ({
      award: award.label,
      player: award.player.name,
      team:
        contexts.byEaId.get(
          award.player.teamId,
        )?.abbreviation ?? null,
    })),
  };
}

type RecordLine = {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  results: string[];
};

function emptyRecord(): RecordLine {
  return {
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    results: [],
  };
}

function recordText(line: RecordLine) {
  return line.ties
    ? `${line.wins}-${line.losses}-${line.ties}`
    : `${line.wins}-${line.losses}`;
}

function winPct(line: RecordLine) {
  const games =
    line.wins + line.losses + line.ties;

  if (!games) return 0.5;

  return (
    (line.wins + line.ties * 0.5) /
    games
  );
}

function ppg(line: RecordLine) {
  const games =
    line.wins + line.losses + line.ties;

  return games
    ? line.pointsFor / games
    : 0;
}

function papg(line: RecordLine) {
  const games =
    line.wins + line.losses + line.ties;

  return games
    ? line.pointsAgainst / games
    : 0;
}

function pdg(line: RecordLine) {
  return ppg(line) - papg(line);
}

async function findTeamEmoji(
  guildId: string,
  team: TeamContext,
) {
  const emojis =
    await discordRequest<DiscordEmoji[]>(
      `/guilds/${guildId}/emojis`,
    );

  const targets = [
    normalized(team.abbreviation),
    normalized(team.name),
    normalized(`${team.city}${team.name}`),
  ];

  const match = emojis.find((emoji) => {
    const name = normalized(emoji.name);

    return targets.some(
      (target) =>
        name === target ||
        name.includes(target),
    );
  });

  return match
    ? `${match.name}:${match.id}`
    : null;
}

async function react(
  channelId: string,
  messageId: string,
  emoji: string,
) {
  await discordRequest<null>(
    `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(
      emoji,
    )}/@me`,
    {
      method: "PUT",
    },
  );
}

async function postGotw({
  leagueId,
  season,
  currentWeek,
  channelId,
  guildId,
  contexts,
}: {
  leagueId: string;
  season: number;
  currentWeek: number;
  channelId: string;
  guildId: string;
  contexts: Awaited<
    ReturnType<typeof loadContexts>
  >;
}) {
  const marker =
    `season-${season}-week-${currentWeek}-gotw-posted`;

  if (await markerExists(marker)) {
    return {
      action: "already_posted",
      week: currentWeek,
    };
  }

  const currentGamesResult =
    await supabaseAdmin
      .from("league_games")
      .select(
        "id, home_team_id, away_team_id, home_team_abbreviation, away_team_abbreviation, status, is_primetime",
      )
      .eq("league_id", leagueId)
      .eq("season", season)
      .eq("week", currentWeek)
      .neq("status", "cancelled");

  if (currentGamesResult.error) {
    throw currentGamesResult.error;
  }

  const candidates = (
    currentGamesResult.data ?? []
  ).filter(
    (game) => game.status !== "final",
  );

  if (!candidates.length) {
    return {
      action: "skip",
      reason:
        "No unplayed games remain this week.",
    };
  }

  const pastResult = await supabaseAdmin
    .from("league_games")
    .select(
      "week, home_team_id, away_team_id, home_score, away_score",
    )
    .eq("league_id", leagueId)
    .eq("season", season)
    .eq("status", "final")
    .lt("week", currentWeek)
    .order("week", {
      ascending: true,
    });

  if (pastResult.error) {
    throw pastResult.error;
  }

  const records = new Map<
    string,
    RecordLine
  >();

  for (const team of contexts.all) {
    records.set(team.id, emptyRecord());
  }

  for (const game of pastResult.data ?? []) {
    const homeId = String(
      game.home_team_id ?? "",
    );
    const awayId = String(
      game.away_team_id ?? "",
    );

    const home =
      records.get(homeId) ?? emptyRecord();
    const away =
      records.get(awayId) ?? emptyRecord();

    const homeScore = num(game.home_score);
    const awayScore = num(game.away_score);

    home.pointsFor += homeScore;
    home.pointsAgainst += awayScore;

    away.pointsFor += awayScore;
    away.pointsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.results.push("W");
      away.results.push("L");
    } else if (awayScore > homeScore) {
      away.wins += 1;
      home.losses += 1;
      away.results.push("W");
      home.results.push("L");
    } else {
      home.ties += 1;
      away.ties += 1;
      home.results.push("T");
      away.results.push("T");
    }

    records.set(homeId, home);
    records.set(awayId, away);
  }

  const ranked = candidates
    .map((game) => {
      const home =
        contexts.byId.get(
          String(game.home_team_id),
        ) ??
        contexts.byAbbr.get(
          str(
            game.home_team_abbreviation,
          ).toUpperCase(),
        );

      const away =
        contexts.byId.get(
          String(game.away_team_id),
        ) ??
        contexts.byAbbr.get(
          str(
            game.away_team_abbreviation,
          ).toUpperCase(),
        );

      if (!home || !away) return null;

      const homeRecord =
        records.get(home.id) ??
        emptyRecord();

      const awayRecord =
        records.get(away.id) ??
        emptyRecord();

      const homePct = winPct(homeRecord);
      const awayPct = winPct(awayRecord);

      const divisionRivalry =
        Boolean(home.division) &&
        home.division === away.division;

      const sameConference =
        home.conference === away.conference;

      const quality =
        (homePct + awayPct) * 55;

      const competitive =
        Math.max(
          0,
          40 -
            Math.abs(
              homePct - awayPct,
            ) *
              70,
        );

      const scoringMarginMatch =
        Math.max(
          0,
          25 -
            Math.abs(
              pdg(homeRecord) -
                pdg(awayRecord),
            ),
        );

      const recentWins =
        homeRecord.results
          .slice(-3)
          .filter((result) => result === "W")
          .length +
        awayRecord.results
          .slice(-3)
          .filter((result) => result === "W")
          .length;

      const score =
        quality +
        competitive +
        scoringMarginMatch +
        recentWins * 4 +
        (divisionRivalry ? 35 : 0) +
        (sameConference ? 5 : 0) +
        (game.is_primetime ? 8 : 0);

      const reason = divisionRivalry
        ? `${home.division} rivalry`
        : homePct >= 0.5 &&
            awayPct >= 0.5
          ? "Winning-record showdown"
          : "Best matchup by record, form & scoring margin";

      return {
        game,
        home,
        away,
        homeRecord,
        awayRecord,
        score,
        reason,
      };
    })
    .filter(
      (
        value,
      ): value is NonNullable<
        typeof value
      > => Boolean(value),
    )
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0];

  if (!selected) {
    return {
      action: "skip",
      reason:
        "No eligible GOTW matchup found.",
    };
  }

  const site =
    (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "https://new-era-cfm.vercel.app"
    ).replace(/\/+$/, "");

  const imageParams = new URLSearchParams({
    season: String(season),
    week: String(currentWeek),
    away: selected.away.abbreviation,
    home: selected.home.abbreviation,
    awayRecord: recordText(
      selected.awayRecord,
    ),
    homeRecord: recordText(
      selected.homeRecord,
    ),
    reason: selected.reason,
  });

  const imageUrl =
    `${site}/api/media/gotw?${imageParams.toString()}`;

  const ownerIds = [
    selected.away.ownerDiscordId,
    selected.home.ownerDiscordId,
  ].filter(
    (id): id is string => Boolean(id),
  );

  const awayEmoji =
    await findTeamEmoji(
      guildId,
      selected.away,
    ).catch(() => null);

  const homeEmoji =
    await findTeamEmoji(
      guildId,
      selected.home,
    ).catch(() => null);

  const awayReaction =
    awayEmoji || "1️⃣";

  const homeReaction =
    homeEmoji || "2️⃣";

  const message =
    await discordRequest<DiscordMessage>(
      `/channels/${channelId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content:
            ownerIds.length
              ? `${ownerIds
                  .map((id) => `<@${id}>`)
                  .join(
                    " ",
                  )}\n🔥 **WEEK ${currentWeek} GAME OF THE WEEK — VOTE BELOW**`
              : `🔥 **WEEK ${currentWeek} GAME OF THE WEEK — VOTE BELOW**`,
          allowed_mentions: {
            parse: [],
            users: ownerIds,
          },
          embeds: [
            {
              title:
                `🔥 WEEK ${currentWeek} GAME OF THE WEEK`,
              description:
                `**${selected.away.city} ${selected.away.name}** @ **${selected.home.city} ${selected.home.name}**\n\n` +
                `Selected using league record, scoring margin, recent form, matchup quality and rivalry value.`,
              color: 0xf59e0b,
              fields: [
                {
                  name:
                    `${selected.away.abbreviation} — ${recordText(
                      selected.awayRecord,
                    )}`,
                  value:
                    `PPG ${ppg(
                      selected.awayRecord,
                    ).toFixed(
                      1,
                    )} • PA/G ${papg(
                      selected.awayRecord,
                    ).toFixed(
                      1,
                    )} • DIFF ${
                      pdg(
                        selected.awayRecord,
                      ) >= 0
                        ? "+"
                        : ""
                    }${pdg(
                      selected.awayRecord,
                    ).toFixed(1)}`,
                  inline: true,
                },
                {
                  name:
                    `${selected.home.abbreviation} — ${recordText(
                      selected.homeRecord,
                    )}`,
                  value:
                    `PPG ${ppg(
                      selected.homeRecord,
                    ).toFixed(
                      1,
                    )} • PA/G ${papg(
                      selected.homeRecord,
                    ).toFixed(
                      1,
                    )} • DIFF ${
                      pdg(
                        selected.homeRecord,
                      ) >= 0
                        ? "+"
                        : ""
                    }${pdg(
                      selected.homeRecord,
                    ).toFixed(1)}`,
                  inline: true,
                },
                {
                  name: "Why this game?",
                  value: selected.reason,
                  inline: false,
                },
                {
                  name: "Community Vote",
                  value:
                    awayEmoji && homeEmoji
                      ? `React with the **${selected.away.abbreviation} logo** or **${selected.home.abbreviation} logo** below.`
                      : `1️⃣ ${selected.away.abbreviation}\n2️⃣ ${selected.home.abbreviation}`,
                  inline: false,
                },
              ],
              image: {
                url: imageUrl,
              },
              footer: {
                text:
                  `New Era CFM • Season ${season}`,
              },
            },
          ],
        }),
      },
    );

  await Promise.allSettled([
    react(
      channelId,
      message.id,
      awayReaction,
    ),
    react(
      channelId,
      message.id,
      homeReaction,
    ),
  ]);

  await writeMarker(marker, {
    messageId: message.id,
    channelId,
    season,
    week: currentWeek,
    away: selected.away.abbreviation,
    home: selected.home.abbreviation,
    reason: selected.reason,
    awayReaction,
    homeReaction,
  });

  return {
    action: "posted",
    week: currentWeek,
    messageId: message.id,
    matchup:
      `${selected.away.abbreviation} @ ${selected.home.abbreviation}`,
    reason: selected.reason,
    logoReactions:
      Boolean(awayEmoji && homeEmoji),
  };
}

export async function runWeeklyHighlights({
  leagueId,
  season,
  currentWeek,
}: {
  leagueId: string;
  season: number;
  currentWeek: number;
}) {
  const channels = await resolveChannels();
  const contexts =
    await loadContexts(leagueId);

  const potw = await postPotw({
    leagueId,
    season,
    currentWeek,
    channelId: channels.potwId,
    contexts,
  }).catch((error) => ({
    action: "error",
    error:
      error instanceof Error
        ? error.message
        : String(error),
  }));

  const gotw = await postGotw({
    leagueId,
    season,
    currentWeek,
    channelId: channels.gotwId,
    guildId: channels.guildId,
    contexts,
  }).catch((error) => ({
    action: "error",
    error:
      error instanceof Error
        ? error.message
        : String(error),
  }));

  return {
    channels: {
      gotw: {
        id: channels.gotwId,
        name: channels.gotwName,
      },
      potw: {
        id: channels.potwId,
        name: channels.potwName,
      },
    },
    potw,
    gotw,
  };
}
