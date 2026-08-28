import { NFL_TEAMS } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

type LeagueRow = {
  id: string;
  name: string | null;
  season: number | null;
  current_week: number | null;
};

type TeamRow = {
  id: string;
  city: string | null;
  name: string;
  abbreviation: string;
  owner_member_id: string | null;
};

type MemberRow = {
  id: string;
  discord_id: string | null;
  discord_username: string | null;
  display_name: string;
  is_active: boolean;
  last_seen_at: string | null;
};

type GameRow = {
  id: string;
  week: number;
  game_type: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_abbreviation: string | null;
  away_team_abbreviation: string | null;
  scheduled_at: string | null;
  status: "scheduled" | "in_progress" | "final" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  raw_payload: unknown;
};

type DiscordSummaryRow = {
  discord_id: string;
  messages_7d: number | string;
  messages_30d: number | string;
  last_message_at: string | null;
};

type ActiveCheckRow = {
  active_check_id: string;
  check_type: "league" | "weekly" | "waitlist" | "unknown";
  title: string | null;
  started_at: string;
};

type CheckClickRow = {
  active_check_id: string;
  discord_id: string | null;
  team_slug: string | null;
  checked_in_at: string;
};

type SyncStateRow = {
  last_started_at: string | null;
  last_completed_at: string | null;
  last_error: string | null;
  channels_scanned: number;
  messages_seen: number;
  messages_saved: number;
};

type HealthStatus =
  | "active_user"
  | "monitor"
  | "hot_seat"
  | "replacement_risk";

type HealthComponent = {
  key: "games" | "discord" | "activeChecks";
  label: string;
  score: number;
  weight: number;
};

type GameKind =
  | "played"
  | "sim"
  | "unknown"
  | "unplayed";

function clamp(
  value: number,
  min = 0,
  max = 100,
) {
  return Math.min(
    max,
    Math.max(min, value),
  );
}

function weightedScore(
  components: HealthComponent[],
) {
  if (!components.length) {
    return 0;
  }

  const weight =
    components.reduce(
      (total, component) =>
        total + component.weight,
      0,
    );

  if (!weight) {
    return 0;
  }

  return Math.round(
    components.reduce(
      (total, component) =>
        total +
        component.score *
          component.weight,
      0,
    ) / weight,
  );
}

function healthLabel(
  score: number,
): HealthStatus {
  if (score >= 80) {
    return "active_user";
  }

  if (score >= 65) {
    return "monitor";
  }

  if (score >= 45) {
    return "hot_seat";
  }

  return "replacement_risk";
}

function hoursSince(
  value: string | null,
) {
  if (!value) return null;

  return Math.max(
    0,
    (
      Date.now() -
      new Date(value).getTime()
    ) /
      3_600_000,
  );
}

function normalizeSlug(
  value: string | null | undefined,
) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function teamSlug(
  team: TeamRow,
) {
  const known =
    NFL_TEAMS.find(
      (entry) =>
        entry.abbreviation.toUpperCase() ===
        team.abbreviation.toUpperCase(),
    );

  return (
    known?.slug ??
    normalizeSlug(team.name)
  );
}

function asRecord(
  value: unknown,
) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function rawEaStatus(
  game: GameRow,
) {
  const raw =
    asRecord(
      game.raw_payload,
    );

  const parsed =
    Number(raw.status);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

/*
 * M27 CALIBRATION
 *
 * Current exports show:
 * 1 = unplayed
 * 2/3 = completed variants.
 *
 * We start with:
 * 2 = user-played
 * 3 = sim/force result.
 *
 * These can be flipped instantly through Vercel env
 * if our Dolphins sanity check proves Madden uses
 * them the opposite way.
 */
const EA_PLAYED_STATUS =
  Number(
    process.env
      .LEAGUE_HEALTH_EA_PLAYED_STATUS ??
      2,
  );

const EA_SIM_STATUS =
  Number(
    process.env
      .LEAGUE_HEALTH_EA_SIM_STATUS ??
      3,
  );

function classifyGame(
  game: GameRow,
): GameKind {
  if (
    game.status !== "final"
  ) {
    return "unplayed";
  }

  const status =
    rawEaStatus(game);

  if (
    status ===
    EA_PLAYED_STATUS
  ) {
    return "played";
  }

  if (
    status ===
    EA_SIM_STATUS
  ) {
    return "sim";
  }

  return "unknown";
}

function discordScore(
  messages7d: number,
  lastMessageAt: string | null,
) {
  if (messages7d >= 15) {
    return 100;
  }

  if (messages7d >= 8) {
    return 85;
  }

  if (messages7d >= 4) {
    return 70;
  }

  if (messages7d >= 2) {
    return 50;
  }

  if (messages7d === 1) {
    return 30;
  }

  const age =
    hoursSince(
      lastMessageAt,
    );

  if (
    age !== null &&
    age <= 14 * 24
  ) {
    return 10;
  }

  return 0;
}

function weightedCheckScore(
  results: {
    hit: boolean;
  }[],
) {
  if (!results.length) {
    return 100;
  }

  const weights =
    [5, 4, 3, 2, 1];

  let earned = 0;
  let possible = 0;

  results
    .slice(0, 5)
    .forEach(
      (
        result,
        index,
      ) => {
        const weight =
          weights[index] ?? 1;

        possible += weight;

        if (result.hit) {
          earned += weight;
        }
      },
    );

  return possible
    ? Math.round(
        (
          earned /
          possible
        ) * 100,
      )
    : 100;
}

function containsTeam(
  game: GameRow,
  teamId: string,
) {
  return (
    game.home_team_id ===
      teamId ||
    game.away_team_id ===
      teamId
  );
}

export async function buildLeagueHealthReport() {
  const leagueResult =
    await supabaseAdmin
      .from("leagues")
      .select(
        "id, name, season, current_week",
      )
      .eq(
        "slug",
        "new-era-cfm",
      )
      .maybeSingle();

  if (leagueResult.error) {
    throw leagueResult.error;
  }

  if (!leagueResult.data) {
    throw new Error(
      "NEW ERA league record was not found.",
    );
  }

  const league =
    leagueResult.data as LeagueRow;

  const season =
    Number(
      league.season ?? 1,
    );

  const currentWeek =
    Number(
      league.current_week ?? 1,
    );

  const [
    teamsResult,
    gamesResult,
    discordResult,
    checksResult,
    syncStateResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from("teams")
        .select(
          "id, city, name, abbreviation, owner_member_id",
        )
        .eq(
          "league_id",
          league.id,
        )
        .order(
          "city",
          {
            ascending: true,
          },
        ),

      supabaseAdmin
        .from("league_games")
        .select(
          "id, week, game_type, home_team_id, away_team_id, home_team_abbreviation, away_team_abbreviation, scheduled_at, status, home_score, away_score, raw_payload",
        )
        .eq(
          "league_id",
          league.id,
        )
        .eq(
          "season",
          season,
        )
        .eq(
          "game_type",
          "regular",
        )
        .lte(
          "week",
          currentWeek,
        ),

      supabaseAdmin.rpc(
        "get_league_health_discord_summary",
      ),

      supabaseAdmin
        .from(
          "league_health_active_checks",
        )
        .select(
          "active_check_id, check_type, title, started_at",
        )
        .neq(
          "check_type",
          "waitlist",
        )
        .order(
          "started_at",
          {
            ascending: false,
          },
        )
        .limit(5),

      supabaseAdmin
        .from(
          "league_health_sync_state",
        )
        .select(
          "last_started_at, last_completed_at, last_error, channels_scanned, messages_seen, messages_saved",
        )
        .eq(
          "id",
          "discord",
        )
        .maybeSingle(),
    ]);

  const error =
    teamsResult.error ||
    gamesResult.error ||
    discordResult.error ||
    checksResult.error ||
    syncStateResult.error;

  if (error) {
    throw error;
  }

  const teams =
    (
      teamsResult.data ??
      []
    ) as TeamRow[];

  const games =
    (
      gamesResult.data ??
      []
    ) as GameRow[];

  const discordRows =
    (
      discordResult.data ??
      []
    ) as DiscordSummaryRow[];

  const checks =
    (
      checksResult.data ??
      []
    ) as ActiveCheckRow[];

  const syncState =
    (
      syncStateResult.data ??
      null
    ) as
      | SyncStateRow
      | null;

  /*
   * Week 6 just starting DOES NOT count
   * against anybody.
   *
   * Only Weeks 1-5 are accountability
   * data while currentWeek === 6.
   */
  const historicalGames =
    games.filter(
      (game) =>
        game.week <
        currentWeek,
    );

  const currentGames =
    games.filter(
      (game) =>
        game.week ===
        currentWeek,
    );

  const ownerIds =
    teams
      .map(
        (team) =>
          team.owner_member_id,
      )
      .filter(
        (
          id,
        ): id is string =>
          Boolean(id),
      );

  const membersResult =
    ownerIds.length
      ? await supabaseAdmin
          .from("members")
          .select(
            "id, discord_id, discord_username, display_name, is_active, last_seen_at",
          )
          .in(
            "id",
            ownerIds,
          )
      : {
          data: [],
          error: null,
        };

  if (
    membersResult.error
  ) {
    throw membersResult.error;
  }

  const members =
    (
      membersResult.data ??
      []
    ) as MemberRow[];

  const memberById =
    new Map(
      members.map(
        (member) => [
          member.id,
          member,
        ],
      ),
    );

  const discordById =
    new Map(
      discordRows.map(
        (row) => [
          row.discord_id,
          {
            messages7d:
              Number(
                row.messages_7d ??
                  0,
              ),

            messages30d:
              Number(
                row.messages_30d ??
                  0,
              ),

            lastMessageAt:
              row.last_message_at,
          },
        ],
      ),
    );

  const checkIds =
    checks.map(
      (check) =>
        check.active_check_id,
    );

  const [
    liveClicksResult,
    archivedClicksResult,
  ] =
    checkIds.length
      ? await Promise.all([
          supabaseAdmin
            .from(
              "active_check_clicks",
            )
            .select(
              "active_check_id, discord_id, team_slug, checked_in_at",
            )
            .in(
              "active_check_id",
              checkIds,
            ),

          supabaseAdmin
            .from(
              "active_check_click_archive",
            )
            .select(
              "active_check_id, discord_id, team_slug, checked_in_at",
            )
            .in(
              "active_check_id",
              checkIds,
            ),
        ])
      : [
          {
            data: [],
            error: null,
          },
          {
            data: [],
            error: null,
          },
        ];

  if (
    liveClicksResult.error
  ) {
    throw liveClicksResult.error;
  }

  if (
    archivedClicksResult.error
  ) {
    throw archivedClicksResult.error;
  }

  const clicks = [
    ...(
      (
        liveClicksResult.data ??
        []
      ) as CheckClickRow[]
    ),

    ...(
      (
        archivedClicksResult.data ??
        []
      ) as CheckClickRow[]
    ),
  ];

  const clickKeys =
    new Set<string>();

  for (
    const click
    of clicks
  ) {
    if (
      click.team_slug
    ) {
      clickKeys.add(
        `${click.active_check_id}:team:${normalizeSlug(
          click.team_slug,
        )}`,
      );
    }

    if (
      click.discord_id
    ) {
      clickKeys.add(
        `${click.active_check_id}:user:${click.discord_id}`,
      );
    }
  }

  const currentGameByTeam =
    new Map<
      string,
      GameRow
    >();

  for (
    const game
    of currentGames
  ) {
    if (
      game.home_team_id
    ) {
      currentGameByTeam.set(
        game.home_team_id,
        game,
      );
    }

    if (
      game.away_team_id
    ) {
      currentGameByTeam.set(
        game.away_team_id,
        game,
      );
    }
  }

  const discordAvailable =
    Boolean(
      syncState
        ?.last_completed_at,
    );

  const activeChecksAvailable =
    checks.length > 0;

  const latestCheck =
    checks[0] ?? null;

  const latestCheckAge =
    hoursSince(
      latestCheck
        ?.started_at ??
        null,
    );

  const teamReports =
    teams.map(
      (team) => {
        const owner =
          team.owner_member_id
            ? (
                memberById.get(
                  team.owner_member_id,
                ) ??
                null
              )
            : null;

        const slug =
          teamSlug(team);

        const discordActivity =
          owner?.discord_id
            ? (
                discordById.get(
                  owner.discord_id,
                ) ??
                {
                  messages7d: 0,
                  messages30d: 0,
                  lastMessageAt: null,
                }
              )
            : {
                messages7d: 0,
                messages30d: 0,
                lastMessageAt: null,
              };

        const teamHistory =
          historicalGames
            .filter(
              (game) =>
                containsTeam(
                  game,
                  team.id,
                ),
            )
            .sort(
              (a, b) =>
                b.week -
                a.week,
            );

        const classified =
          teamHistory.map(
            (game) => ({
              game,
              kind:
                classifyGame(
                  game,
                ),
            }),
          );

        const realPlayed =
          classified.filter(
            (entry) =>
              entry.kind ===
              "played",
          ).length;

        const fairSims =
          classified.filter(
            (entry) =>
              entry.kind ===
              "sim",
          ).length;

        const unknownFinals =
          classified.filter(
            (entry) =>
              entry.kind ===
              "unknown",
          ).length;

        const unplayed =
          classified.filter(
            (entry) =>
              entry.kind ===
              "unplayed",
          ).length;

        const eligible =
          teamHistory.length;

        const recentTwo =
          classified.slice(
            0,
            2,
          );

        const recentReal =
          recentTwo.filter(
            (entry) =>
              entry.kind ===
              "played",
          ).length;

        const components:
          HealthComponent[] =
            [];

        const attention:
          string[] =
            [];

        const gameScore =
          eligible > 0
            ? Math.round(
                (
                  realPlayed /
                  eligible
                ) * 100,
              )
            : 100;

        components.push({
          key:
            "games",
          label:
            "Actual games played",
          score:
            gameScore,
          weight:
            50,
        });

        if (
          fairSims > 0
        ) {
          attention.push(
            `${fairSims} fair sim/force result${
              fairSims === 1
                ? ""
                : "s"
            } — no game credit`,
          );
        }

        if (
          unknownFinals >
          0
        ) {
          attention.push(
            `${unknownFinals} completed game${
              unknownFinals ===
              1
                ? ""
                : "s"
            } not verified as user-played`,
          );
        }

        if (
          unplayed > 0
        ) {
          attention.push(
            `${unplayed} past-week game${
              unplayed === 1
                ? ""
                : "s"
            } unplayed`,
          );
        }

        if (
          recentTwo.length >=
            2 &&
          recentReal ===
            0
        ) {
          attention.push(
            "0 actual games played in last 2 eligible weeks",
          );
        }

        const checkResults =
          checks.map(
            (check) => {
              const hit =
                clickKeys.has(
                  `${check.active_check_id}:team:${slug}`,
                ) ||
                Boolean(
                  owner
                    ?.discord_id &&
                    clickKeys.has(
                      `${check.active_check_id}:user:${owner.discord_id}`,
                    ),
                );

              return {
                id:
                  check.active_check_id,
                hit,
              };
            },
          );

        /*
         * Don't count the newest active check as
         * missed until it has been open 12 hours.
         */
        const countableChecks =
          checkResults.filter(
            (
              result,
              index,
            ) => {
              if (
                index > 0 ||
                result.hit
              ) {
                return true;
              }

              return (
                latestCheckAge !==
                  null &&
                latestCheckAge >=
                  12
              );
            },
          );

        const checkHits =
          countableChecks.filter(
            (result) =>
              result.hit,
          ).length;

        const checkMisses =
          countableChecks.length -
          checkHits;

        let consecutiveMisses =
          0;

        for (
          const result
          of countableChecks
        ) {
          if (
            result.hit
          ) {
            break;
          }

          consecutiveMisses +=
            1;
        }

        if (
          activeChecksAvailable
        ) {
          components.push({
            key:
              "activeChecks",
            label:
              "Active checks",
            score:
              weightedCheckScore(
                countableChecks,
              ),
            weight:
              30,
          });
        }

        if (
          consecutiveMisses >=
          2
        ) {
          attention.push(
            `${consecutiveMisses} active checks missed in a row`,
          );
        } else if (
          checkMisses > 0
        ) {
          attention.push(
            `${checkMisses} recent active check${
              checkMisses ===
              1
                ? ""
                : "s"
            } missed`,
          );
        }

        if (
          owner &&
          discordAvailable
        ) {
          components.push({
            key:
              "discord",
            label:
              "Discord chat",
            score:
              discordScore(
                discordActivity
                  .messages7d,
                discordActivity
                  .lastMessageAt,
              ),
            weight:
              20,
          });
        }

        if (
          discordAvailable &&
          discordActivity
            .messages7d ===
            0
        ) {
          attention.push(
            "No Discord messages in 7 days",
          );
        } else if (
          discordAvailable &&
          discordActivity
            .messages7d <
            4
        ) {
          attention.push(
            "Low Discord activity",
          );
        }

        if (!owner) {
          attention.unshift(
            "No connected team owner",
          );
        }

        let score =
          clamp(
            weightedScore(
              components,
            ),
          );

        /*
         * HARD ACCOUNTABILITY CAPS
         *
         * Chat activity cannot rescue an owner
         * who simply isn't playing.
         */
        if (!owner) {
          score =
            Math.min(
              score,
              20,
            );
        }

        if (
          eligible >= 3 &&
          realPlayed === 0
        ) {
          score =
            Math.min(
              score,
              39,
            );
        }

        if (
          recentTwo.length >=
            2 &&
          recentReal ===
            0
        ) {
          score =
            Math.min(
              score,
              59,
            );
        }

        if (
          fairSims >= 2 &&
          eligible >= 3 &&
          realPlayed /
            eligible <
            0.5
        ) {
          score =
            Math.min(
              score,
              59,
            );
        }

        if (
          consecutiveMisses >=
          3
        ) {
          score =
            Math.min(
              score,
              39,
            );
        } else if (
          consecutiveMisses >=
          2
        ) {
          score =
            Math.min(
              score,
              59,
            );
        }

        const currentGame =
          currentGameByTeam.get(
            team.id,
          ) ??
          null;

        return {
          team: {
            id:
              team.id,
            slug,
            city:
              team.city,
            name:
              team.name,
            abbreviation:
              team.abbreviation,
          },

          owner:
            owner
              ? {
                  id:
                    owner.id,
                  discordId:
                    owner.discord_id,
                  username:
                    owner.discord_username,
                  displayName:
                    owner.display_name,
                  websiteActive:
                    owner.is_active,
                  lastWebsiteSeenAt:
                    owner.last_seen_at,
                }
              : null,

          game:
            currentGame
              ? {
                  id:
                    currentGame.id,
                  status:
                    currentGame.status,
                  scheduledAt:
                    currentGame.scheduled_at,
                  homeScore:
                    currentGame.home_score,
                  awayScore:
                    currentGame.away_score,
                  opponentAbbreviation:
                    currentGame
                      .home_team_id ===
                    team.id
                      ? currentGame
                          .away_team_abbreviation
                      : currentGame
                          .home_team_abbreviation,
                  overdue:
                    false,
                }
              : null,

          games: {
            eligible,
            realPlayed,
            fairSims,
            unknownFinals,
            unplayed,
            recentReal,
          },

          discord: {
            available:
              discordAvailable,
            messages7d:
              discordActivity
                .messages7d,
            messages30d:
              discordActivity
                .messages30d,
            lastMessageAt:
              discordActivity
                .lastMessageAt,
          },

          activeChecks: {
            available:
              activeChecksAvailable,
            total:
              countableChecks.length,
            hits:
              checkHits,
            misses:
              checkMisses,
            consecutiveMisses,
            latest:
              countableChecks.length ===
              0
                ? "no_data"
                : countableChecks[0]
                    .hit
                  ? "hit"
                  : "missed",
          },

          components,
          score,
          status:
            healthLabel(
              score,
            ),
          attention,
        };
      },
    );

  const rank:
    Record<
      HealthStatus,
      number
    > =
    {
      replacement_risk:
        0,
      hot_seat:
        1,
      monitor:
        2,
      active_user:
        3,
    };

  teamReports.sort(
    (
      a,
      b,
    ) => {
      const statusDiff =
        rank[a.status] -
        rank[b.status];

      if (
        statusDiff !== 0
      ) {
        return statusDiff;
      }

      return (
        a.score -
        b.score
      );
    },
  );

  const historicalKinds =
    historicalGames.map(
      classifyGame,
    );

  const realGames =
    historicalKinds.filter(
      (kind) =>
        kind ===
        "played",
    ).length;

  const fairSimGames =
    historicalKinds.filter(
      (kind) =>
        kind ===
        "sim",
    ).length;

  const unknownGames =
    historicalKinds.filter(
      (kind) =>
        kind ===
        "unknown",
    ).length;

  const assignedOwners =
    teamReports.filter(
      (team) =>
        team.owner,
    ).length;

  const activeDiscord =
    teamReports.filter(
      (team) =>
        team.owner &&
        team.discord
          .messages7d >
          0,
    ).length;

  const latestCheckHits =
    teamReports.filter(
      (team) =>
        team.activeChecks
          .latest ===
        "hit",
    ).length;

  const scores =
    teamReports.map(
      (team) =>
        team.score,
    );

  const overallScore =
    scores.length
      ? Math.round(
          scores.reduce(
            (
              total,
              score,
            ) =>
              total +
              score,
            0,
          ) /
            scores.length,
        )
      : 0;

  const lastDiscordSync =
    syncState
      ?.last_completed_at ??
    null;

  const shouldSync =
    !lastDiscordSync ||
    Date.now() -
      new Date(
        lastDiscordSync,
      ).getTime() >
      3_600_000;

  return {
    revision:
      "league-health-v3-real-games",

    generatedAt:
      new Date()
        .toISOString(),

    calibration: {
      eaPlayedStatus:
        EA_PLAYED_STATUS,
      eaSimStatus:
        EA_SIM_STATUS,
    },

    league: {
      id:
        league.id,
      name:
        league.name ??
        "NEW ERA CFM",
      season,
      currentWeek,
    },

    overall: {
      score:
        overallScore,
      status:
        healthLabel(
          overallScore,
        ),
      teamsTracked:
        teams.length,
      attentionCount:
        teamReports.filter(
          (team) =>
            team.status !==
            "active_user",
        ).length,
    },

    metrics: {
      owners: {
        assigned:
          assignedOwners,
        total:
          teams.length,
      },

      games: {
        available:
          historicalGames.length >
          0,
        completed:
          realGames,
        total:
          historicalGames.length,
        pending:
          unknownGames,
        realPlayed:
          realGames,
        fairSims:
          fairSimGames,
      },

      discord: {
        available:
          discordAvailable,
        activeOwners:
          activeDiscord,
        assignedOwners,
      },

      activeChecks: {
        available:
          activeChecksAvailable,
        latestCheckId:
          latestCheck
            ?.active_check_id ??
          null,
        latestTitle:
          latestCheck
            ?.title ??
          null,
        latestStartedAt:
          latestCheck
            ?.started_at ??
          null,
        hits:
          latestCheckHits,
        eligibleOwners:
          assignedOwners,
        checksTracked:
          checks.length,
      },
    },

    dataSources: {
      games: {
        ready:
          historicalGames.length >
          0,
        label:
          `${realGames} actual games • ${fairSimGames} fair sims excluded`,
      },

      discord: {
        ready:
          discordAvailable,
        label:
          discordAvailable
            ? `Last synced ${lastDiscordSync}`
            : "Discord activity has not synced yet",
        lastCompletedAt:
          lastDiscordSync,
        lastError:
          syncState
            ?.last_error ??
          null,
        channelsScanned:
          Number(
            syncState
              ?.channels_scanned ??
              0,
          ),
      },

      activeChecks: {
        ready:
          activeChecksAvailable,
        label:
          activeChecksAvailable
            ? `${checks.length} recent checks tracked`
            : "Waiting for an active check",
      },
    },

    shouldSync,
    teams:
      teamReports,
  };
}
