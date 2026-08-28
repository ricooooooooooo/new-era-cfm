import { supabaseAdmin } from "@/lib/supabase-admin";

type HealthStatus =
  | "active_user"
  | "monitor"
  | "hot_seat"
  | "replacement_risk";

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
};

type DiscordRow = {
  discord_id: string;
  messages_7d: number | string;
  messages_30d: number | string;
  last_message_at: string | null;
};

type SyncState = {
  last_completed_at: string | null;
  last_error: string | null;
  channels_scanned: number | null;
};

type GameRow = {
  id: string;
  week: number;
  game_type: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_abbreviation: string | null;
  away_team_abbreviation: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  raw_payload: unknown;
};

type TeamGameKind =
  | "played"
  | "admin_win"
  | "forced_loss"
  | "neutral_sim"
  | "missed"
  | "unknown";

function object(
  value: unknown,
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function rawStatus(game: GameRow) {
  const value =
    Number(
      object(game.raw_payload).status,
    );

  return Number.isFinite(value)
    ? value
    : null;
}

function clamp(value: number) {
  return Math.min(
    100,
    Math.max(0, value),
  );
}

function healthStatus(
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

function discordScore(
  messages7d: number,
  messages30d: number,
) {
  let weekly = 0;

  if (messages7d >= 15) {
    weekly = 100;
  } else if (messages7d >= 8) {
    weekly = 90;
  } else if (messages7d >= 4) {
    weekly = 75;
  } else if (messages7d >= 2) {
    weekly = 60;
  } else if (messages7d === 1) {
    weekly = 40;
  }

  let monthly = 0;

  if (messages30d >= 40) {
    monthly = 100;
  } else if (messages30d >= 20) {
    monthly = 85;
  } else if (messages30d >= 10) {
    monthly = 70;
  } else if (messages30d >= 5) {
    monthly = 50;
  } else if (messages30d > 0) {
    monthly = 30;
  }

  return Math.round(
    weekly * 0.8 +
    monthly * 0.2,
  );
}

function includesTeam(
  game: GameRow,
  teamId: string,
) {
  return (
    game.home_team_id === teamId ||
    game.away_team_id === teamId
  );
}

function opponent(
  game: GameRow,
  teamId: string,
) {
  return game.home_team_id === teamId
    ? game.away_team_abbreviation
    : game.home_team_abbreviation;
}

function findPlayedStatus(
  games: GameRow[],
) {
  const configured =
    Number(
      process.env
        .LEAGUE_HEALTH_EA_PLAYED_STATUS,
    );

  if (
    configured === 2 ||
    configured === 3
  ) {
    return configured;
  }

  /*
   * CALIBRATION ANCHOR:
   * Week 5 LV @ NE was confirmed manually played.
   *
   * Whatever raw completion status Madden used
   * for that game is the user-played status.
   */
  const knownPlayedGame =
    games.find(
      (game) => {
        if (
          game.week !== 5 ||
          game.status !== "final"
        ) {
          return false;
        }

        const teams =
          new Set([
            game.home_team_abbreviation,
            game.away_team_abbreviation,
          ]);

        return (
          teams.has("LV") &&
          teams.has("NE")
        );
      },
    );

  const knownStatus =
    knownPlayedGame
      ? rawStatus(
          knownPlayedGame,
        )
      : null;

  if (
    knownStatus === 2 ||
    knownStatus === 3
  ) {
    return knownStatus;
  }

  return 2;
}

function classifyForTeam(
  game: GameRow,
  teamId: string,
  playedStatus: number,
  simStatus: number,
): TeamGameKind {
  if (
    game.status !== "final"
  ) {
    return "missed";
  }

  const status =
    rawStatus(game);

  if (
    status === playedStatus
  ) {
    return "played";
  }

  if (
    status === simStatus
  ) {
    if (
      game.winner_team_id ===
      teamId
    ) {
      /*
       * IMPORTANT:
       * Receiving a commissioner force win
       * DOES NOT hurt League Health.
       */
      return "admin_win";
    }

    if (
      game.winner_team_id
    ) {
      return "forced_loss";
    }

    return "neutral_sim";
  }

  return "unknown";
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
        "gold-jacket-cfm",
      )
      .maybeSingle();

  if (leagueResult.error) {
    throw leagueResult.error;
  }

  if (!leagueResult.data) {
    throw new Error(
      "GOLD JACKET league was not found.",
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
    syncResult,
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
        ),

      supabaseAdmin
        .from("league_games")
        .select(
          "id, week, game_type, home_team_id, away_team_id, home_team_abbreviation, away_team_abbreviation, status, home_score, away_score, winner_team_id, raw_payload",
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
        )
        .order(
          "week",
          {
            ascending: true,
          },
        ),

      supabaseAdmin.rpc(
        "get_league_health_discord_summary",
      ),

      supabaseAdmin
        .from(
          "league_health_sync_state",
        )
        .select(
          "last_completed_at, last_error, channels_scanned",
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
    syncResult.error;

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
    ) as DiscordRow[];

  const syncState =
    (
      syncResult.data ??
      null
    ) as SyncState | null;

  const playedStatus =
    findPlayedStatus(
      games,
    );

  const simStatus =
    playedStatus === 2
      ? 3
      : 2;

  const ownerIds =
    teams
      .map(
        (team) =>
          team.owner_member_id,
      )
      .filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      );

  const membersResult =
    ownerIds.length
      ? await supabaseAdmin
          .from("members")
          .select(
            "id, discord_id, discord_username, display_name",
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

  const discordAvailable =
    Boolean(
      syncState
        ?.last_completed_at,
    );

  const reports =
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

        const discordLinked =
          Boolean(
            owner?.discord_id,
          );

        const discord =
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

        /*
         * Previous weeks always count.
         *
         * Current week only enters the health history
         * once the game is final.
         */
        const elapsedGames =
          games
            .filter(
              (game) =>
                includesTeam(
                  game,
                  team.id,
                ),
            )
            .filter(
              (game) =>
                game.week <
                  currentWeek ||
                (
                  game.week ===
                    currentWeek &&
                  game.status ===
                    "final"
                ),
            );

        const history =
          elapsedGames.map(
            (game) => ({
              week:
                game.week,

              opponent:
                opponent(
                  game,
                  team.id,
                ),

              result:
                classifyForTeam(
                  game,
                  team.id,
                  playedStatus,
                  simStatus,
                ),
            }),
          );

        const played =
          history.filter(
            (entry) =>
              entry.result ===
              "played",
          ).length;

        const adminWins =
          history.filter(
            (entry) =>
              entry.result ===
              "admin_win",
          ).length;

        const forcedLosses =
          history.filter(
            (entry) =>
              entry.result ===
              "forced_loss",
          ).length;

        const missed =
          history.filter(
            (entry) =>
              entry.result ===
              "missed",
          ).length;

        const neutralSims =
          history.filter(
            (entry) =>
              entry.result ===
              "neutral_sim",
          ).length;

        const unknown =
          history.filter(
            (entry) =>
              entry.result ===
              "unknown",
          ).length;

        /*
         * FW RECEIVED and neutral simulations
         * are excused from the denominator.
         *
         * The owner should not get punished
         * because their opponent failed to play.
         */
        const accountableGames =
          played +
          forcedLosses +
          missed;

        const participationRate =
          accountableGames > 0
            ? played /
              accountableGames
            : 1;

        let gameplayScore =
          Math.round(
            participationRate *
            100,
          );

        const recent =
          [...history]
            .sort(
              (a, b) =>
                b.week -
                a.week,
            )
            .slice(
              0,
              3,
            );

        const recentBad =
          recent.filter(
            (entry) =>
              entry.result ===
                "forced_loss" ||
              entry.result ===
                "missed",
          ).length;

        /*
         * HARD ACCOUNTABILITY RULES.
         */
        if (
          accountableGames >= 4 &&
          participationRate < 0.5
        ) {
          gameplayScore =
            Math.min(
              gameplayScore,
              44,
            );
        } else if (
          accountableGames >= 4 &&
          participationRate < 0.75
        ) {
          gameplayScore =
            Math.min(
              gameplayScore,
              64,
            );
        }

        if (
          forcedLosses +
            missed >=
          3
        ) {
          gameplayScore =
            Math.min(
              gameplayScore,
              44,
            );
        } else if (
          recentBad >= 2
        ) {
          gameplayScore =
            Math.min(
              gameplayScore,
              64,
            );
        }

        gameplayScore =
          clamp(
            gameplayScore,
          );

        const chatScore =
          discordScore(
            discord.messages7d,
            discord.messages30d,
          );

        /*
         * HEALTH IS ONLY:
         *
         * 80% MADDEN ACTIVITY
         * 20% DISCORD ACTIVITY
         *
         * If Discord isn't linked,
         * Madden becomes 100%.
         *
         * Linking itself NEVER earns
         * or loses points.
         */
        let score =
          discordLinked &&
          discordAvailable
            ? Math.round(
                gameplayScore *
                  0.8 +
                chatScore *
                  0.2,
              )
            : gameplayScore;

        /*
         * Discord can never rescue terrible
         * Madden participation.
         */
        if (
          gameplayScore <= 44
        ) {
          score =
            Math.min(
              score,
              44,
            );
        }

        if (
          gameplayScore <= 64
        ) {
          score =
            Math.min(
              score,
              64,
            );
        }

        score =
          clamp(score);

        const attention:
          string[] =
            [];

        if (
          forcedLosses > 0
        ) {
          attention.push(
            `${forcedLosses} forced/sim loss${
              forcedLosses === 1
                ? ""
                : "es"
            }`,
          );
        }

        if (
          missed > 0
        ) {
          attention.push(
            `${missed} past-week game${
              missed === 1
                ? ""
                : "s"
            } not completed`,
          );
        }

        if (
          accountableGames >= 4 &&
          participationRate < 0.75
        ) {
          attention.push(
            `Only ${played}/${accountableGames} accountable games played`,
          );
        }

        if (
          discordLinked &&
          discordAvailable &&
          discord.messages7d ===
            0
        ) {
          attention.push(
            "No Discord messages in 7 days",
          );
        }

        return {
          team: {
            id:
              team.id,
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
                  displayName:
                    owner.display_name,
                  username:
                    owner.discord_username,
                  discordId:
                    owner.discord_id,
                }
              : null,

          madden: {
            elapsedWeeks:
              history.length,

            played,

            adminWins,

            forcedLosses,

            missed,

            neutralSims,

            unknown,

            accountableGames,

            participationRate:
              Math.round(
                participationRate *
                100,
              ),

            score:
              gameplayScore,

            recent,
          },

          discord: {
            linked:
              discordLinked,

            available:
              discordAvailable,

            messages7d:
              discord.messages7d,

            messages30d:
              discord.messages30d,

            lastMessageAt:
              discord.lastMessageAt,

            score:
              discordLinked &&
              discordAvailable
                ? chatScore
                : null,
          },

          score,

          status:
            healthStatus(
              score,
            ),

          attention,
        };
      },
    );

  const order:
    Record<
      HealthStatus,
      number
    > =
    {
      replacement_risk: 0,
      hot_seat: 1,
      monitor: 2,
      active_user: 3,
    };

  reports.sort(
    (
      a,
      b,
    ) => {
      const statusDifference =
        order[a.status] -
        order[b.status];

      if (
        statusDifference
      ) {
        return statusDifference;
      }

      return (
        a.score -
        b.score
      );
    },
  );

  const overallScore =
    reports.length
      ? Math.round(
          reports.reduce(
            (
              total,
              team,
            ) =>
              total +
              team.score,
            0,
          ) /
            reports.length,
        )
      : 0;

  return {
    revision:
      "league-health-v5-accountability",

    generatedAt:
      new Date()
        .toISOString(),

    calibration: {
      playedStatus,
      simStatus,
      anchor:
        "Week 5 LV @ NE manual game",
    },

    league: {
      id:
        league.id,
      name:
        league.name ??
        "GOLD JACKET CFM",
      season,
      currentWeek,
    },

    overall: {
      score:
        overallScore,
      status:
        healthStatus(
          overallScore,
        ),

      activeUsers:
        reports.filter(
          (team) =>
            team.status ===
            "active_user",
        ).length,

      monitor:
        reports.filter(
          (team) =>
            team.status ===
            "monitor",
        ).length,

      hotSeat:
        reports.filter(
          (team) =>
            team.status ===
            "hot_seat",
        ).length,

      replacementRisk:
        reports.filter(
          (team) =>
            team.status ===
            "replacement_risk",
        ).length,
    },

    dataSources: {
      games: {
        ready:
          games.length > 0,

        label:
          `${games.length} Madden schedule records loaded`,
      },

      discord: {
        ready:
          discordAvailable,

        label:
          discordAvailable
            ? `Discord synced ${syncState?.last_completed_at}`
            : "Discord activity not synced",

        lastError:
          syncState
            ?.last_error ??
          null,
      },
    },

    shouldSync:
      !syncState
        ?.last_completed_at ||
      Date.now() -
        new Date(
          syncState.last_completed_at,
        ).getTime() >
        60 *
          60 *
          1000,

    teams:
      reports,
  };
}
