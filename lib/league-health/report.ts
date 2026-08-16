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
};

type DiscordSummaryRow = {
  discord_id: string;
  messages_7d: number | string;
  messages_30d: number | string;
  last_message_at: string | null;
};

type SyncStateRow = {
  last_completed_at: string | null;
  last_error: string | null;
  channels_scanned: number;
};

type GameRow = {
  id: string;
  season: number;
  week: number;
  game_type: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_abbreviation: string | null;
  away_team_abbreviation: string | null;
  status:
    | "scheduled"
    | "in_progress"
    | "final"
    | "cancelled";
  home_score: number | null;
  away_score: number | null;
  raw_payload: unknown;
};

type HealthStatus =
  | "active_user"
  | "monitor"
  | "hot_seat"
  | "replacement_risk";

type GameResultType =
  | "played"
  | "force_sim"
  | "unknown_final"
  | "not_completed";

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

function asRecord(
  value: unknown,
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
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

/*
 * Madden 27 schedule calibration.
 *
 * Observed:
 * 1 = game not completed
 * 2/3 = completed variants
 *
 * We currently treat:
 * 2 = actual user-played game
 * 3 = force/sim result
 *
 * These remain configurable in Vercel without
 * changing code if M27 proves the reverse.
 */
const EA_PLAYED_STATUS =
  Number(
    process.env
      .LEAGUE_HEALTH_EA_PLAYED_STATUS ??
      2,
  );

const EA_FORCE_SIM_STATUS =
  Number(
    process.env
      .LEAGUE_HEALTH_EA_FORCE_SIM_STATUS ??
      3,
  );

function rawEaStatus(
  game: GameRow,
) {
  const raw =
    asRecord(
      game.raw_payload,
    );

  const value =
    Number(raw.status);

  return Number.isFinite(value)
    ? value
    : null;
}

function classifyGame(
  game: GameRow,
): GameResultType {
  if (
    game.status !== "final"
  ) {
    return "not_completed";
  }

  const rawStatus =
    rawEaStatus(game);

  if (
    rawStatus ===
    EA_PLAYED_STATUS
  ) {
    return "played";
  }

  if (
    rawStatus ===
    EA_FORCE_SIM_STATUS
  ) {
    return "force_sim";
  }

  return "unknown_final";
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
  let recentScore = 0;

  if (messages7d >= 20) {
    recentScore = 100;
  } else if (messages7d >= 10) {
    recentScore = 90;
  } else if (messages7d >= 5) {
    recentScore = 75;
  } else if (messages7d >= 2) {
    recentScore = 55;
  } else if (messages7d === 1) {
    recentScore = 35;
  }

  let monthlyScore = 0;

  if (messages30d >= 50) {
    monthlyScore = 100;
  } else if (messages30d >= 25) {
    monthlyScore = 85;
  } else if (messages30d >= 10) {
    monthlyScore = 70;
  } else if (messages30d >= 5) {
    monthlyScore = 50;
  } else if (messages30d > 0) {
    monthlyScore = 30;
  }

  return Math.round(
    recentScore * 0.75 +
    monthlyScore * 0.25,
  );
}

function containsTeam(
  game: GameRow,
  teamId: string,
) {
  return (
    game.home_team_id === teamId ||
    game.away_team_id === teamId
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
      "NEW ERA league not found.",
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
        ),

      supabaseAdmin
        .from("league_games")
        .select(
          "id, season, week, game_type, home_team_id, away_team_id, home_team_abbreviation, away_team_abbreviation, status, home_score, away_score, raw_payload",
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

  const syncState =
    (
      syncStateResult.data ??
      null
    ) as SyncStateRow | null;

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
    ownerIds.length > 0
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

        /*
         * IMPORTANT:
         * If Discord is not linked,
         * Discord contributes NOTHING.
         *
         * It is not a zero.
         * It is not a penalty.
         */
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
         * Every PREVIOUS week counts.
         *
         * Current week counts only once that
         * team's current game is completed.
         *
         * Therefore Week 6 does not hurt a team
         * just because they haven't played yet.
         */
        const teamGames =
          games
            .filter(
              (game) =>
                containsTeam(
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
            )
            .sort(
              (a, b) =>
                a.week -
                b.week,
            );

        const classified =
          teamGames.map(
            (game) => ({
              week:
                game.week,

              type:
                classifyGame(
                  game,
                ),

              opponent:
                game.home_team_id ===
                team.id
                  ? game
                      .away_team_abbreviation
                  : game
                      .home_team_abbreviation,
            }),
          );

        const eligible =
          classified.length;

        const played =
          classified.filter(
            (entry) =>
              entry.type ===
              "played",
          ).length;

        const forceSims =
          classified.filter(
            (entry) =>
              entry.type ===
              "force_sim",
          ).length;

        const unknownFinals =
          classified.filter(
            (entry) =>
              entry.type ===
              "unknown_final",
          ).length;

        const recent =
          [...classified]
            .sort(
              (a, b) =>
                b.week -
                a.week,
            )
            .slice(
              0,
              3,
            );

        const recentPlayed =
          recent.filter(
            (entry) =>
              entry.type ===
              "played",
          ).length;

        const recentForceSims =
          recent.filter(
            (entry) =>
              entry.type ===
              "force_sim",
          ).length;

        /*
         * GAMEPLAY IS THE MAIN THING.
         *
         * Simply talking in Discord cannot make
         * someone healthy if they don't play.
         */
        const participationRate =
          eligible > 0
            ? played / eligible
            : 1;

        let gameplayScore =
          Math.round(
            participationRate *
            100,
          );

        /*
         * Additional punishment for repeated
         * force/sim outcomes.
         */
        if (
          forceSims >= 2
        ) {
          gameplayScore -=
            (
              forceSims -
              1
            ) * 7;
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
         * 70% Madden
         * 30% Discord
         *
         * BUT:
         * unlinked Discord = Madden only.
         */
        let score =
          discordLinked &&
          discordAvailable
            ? Math.round(
                gameplayScore *
                  0.70 +
                chatScore *
                  0.30,
              )
            : gameplayScore;

        const attention:
          string[] =
            [];

        const playRate =
          eligible > 0
            ? played / eligible
            : 1;

        if (
          forceSims === 1
        ) {
          attention.push(
            "1 force/sim result",
          );
        }

        if (
          forceSims >= 2
        ) {
          attention.push(
            `${forceSims} force/sim results`,
          );
        }

        if (
          eligible >= 2 &&
          recentPlayed === 0
        ) {
          attention.push(
            "No actual game played in recent weeks",
          );
        }

        if (
          eligible >= 4 &&
          playRate < 0.5
        ) {
          attention.push(
            "Played less than half of eligible games",
          );
        }

        if (
          discordLinked &&
          discordAvailable &&
          discord.messages7d ===
            0
        ) {
          attention.push(
            "No Discord activity in 7 days",
          );
        }

        if (
          discordLinked &&
          discordAvailable &&
          discord.messages7d >
            0 &&
          discord.messages7d <
            3
        ) {
          attention.push(
            "Very low Discord activity",
          );
        }

        /*
         * HARD CAPS.
         *
         * This makes the page a real
         * replacement radar.
         */

        // Multiple force/sims means Hot Seat at best.
        if (
          forceSims >= 2
        ) {
          score =
            Math.min(
              score,
              64,
            );
        }

        // Three force/sims = replacement territory.
        if (
          forceSims >= 3
        ) {
          score =
            Math.min(
              score,
              44,
            );
        }

        // Played under half after enough weeks.
        if (
          eligible >= 4 &&
          playRate < 0.5
        ) {
          score =
            Math.min(
              score,
              59,
            );
        }

        // Basically hasn't played at all.
        if (
          eligible >= 4 &&
          played <= 1
        ) {
          score =
            Math.min(
              score,
              44,
            );
        }

        // No real games in last three results.
        if (
          recent.length >= 3 &&
          recentPlayed === 0
        ) {
          score =
            Math.min(
              score,
              44,
            );
        }

        // Two straight non-played outcomes = hot seat.
        if (
          recent.length >= 2 &&
          recent
            .slice(0, 2)
            .every(
              (entry) =>
                entry.type !==
                "played",
            )
        ) {
          score =
            Math.min(
              score,
              59,
            );
        }

        score =
          clamp(score);

        return {
          team: {
            id:
              team.id,

            slug:
              teamSlug(team),

            city:
              team.city,

            name:
              team.name,

            abbreviation:
              team.abbreviation,
          },

          /*
           * Owner is DISPLAY ONLY.
           * Absolutely no score is attached to it.
           */
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
                }
              : null,

          gameplay: {
            eligible,
            played,
            forceSims,
            unknownFinals,

            playRate:
              eligible > 0
                ? Math.round(
                    playRate *
                    100,
                  )
                : 100,

            gameplayScore,

            recentPlayed,
            recentForceSims,

            recent:
              recent.map(
                (entry) => ({
                  week:
                    entry.week,
                  type:
                    entry.type,
                  opponent:
                    entry.opponent,
                }),
              ),
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

  const riskOrder:
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
      const statusDifference =
        riskOrder[
          a.status
        ] -
        riskOrder[
          b.status
        ];

      if (
        statusDifference !==
        0
      ) {
        return statusDifference;
      }

      return (
        a.score -
        b.score
      );
    },
  );

  const uniquePlayedGames =
    games.filter(
      (game) =>
        classifyGame(
          game,
        ) ===
        "played",
    ).length;

  const uniqueForceSimGames =
    games.filter(
      (game) =>
        classifyGame(
          game,
        ) ===
        "force_sim",
    ).length;

  const linkedDiscordTeams =
    teamReports.filter(
      (team) =>
        team.discord.linked,
    );

  const discordActiveTeams =
    linkedDiscordTeams.filter(
      (team) =>
        team.discord
          .messages7d >
        0,
    ).length;

  const overallScore =
    teamReports.length
      ? Math.round(
          teamReports.reduce(
            (
              total,
              team,
            ) =>
              total +
              team.score,
            0,
          ) /
            teamReports.length,
        )
      : 0;

  const lastDiscordSync =
    syncState
      ?.last_completed_at ??
    null;

  return {
    revision:
      "league-health-v4-gameplay-discord-only",

    generatedAt:
      new Date()
        .toISOString(),

    calibration: {
      playedStatus:
        EA_PLAYED_STATUS,

      forceSimStatus:
        EA_FORCE_SIM_STATUS,
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
        healthStatus(
          overallScore,
        ),

      teamsTracked:
        teamReports.length,

      attentionCount:
        teamReports.filter(
          (team) =>
            team.status ===
              "hot_seat" ||
            team.status ===
              "replacement_risk",
        ).length,

      activeUsers:
        teamReports.filter(
          (team) =>
            team.status ===
            "active_user",
        ).length,

      monitors:
        teamReports.filter(
          (team) =>
            team.status ===
            "monitor",
        ).length,

      hotSeat:
        teamReports.filter(
          (team) =>
            team.status ===
            "hot_seat",
        ).length,

      replacementRisk:
        teamReports.filter(
          (team) =>
            team.status ===
            "replacement_risk",
        ).length,
    },

    metrics: {
      games: {
        actual:
          uniquePlayedGames,

        forceSims:
          uniqueForceSimGames,

        currentWeek,
      },

      discord: {
        available:
          discordAvailable,

        linkedTeams:
          linkedDiscordTeams.length,

        activeTeams:
          discordActiveTeams,
      },
    },

    dataSources: {
      games: {
        ready:
          games.length > 0,

        label:
          `${uniquePlayedGames} actual games • ${uniqueForceSimGames} force/sim results`,
      },

      discord: {
        ready:
          discordAvailable,

        label:
          discordAvailable
            ? `Discord activity synced ${lastDiscordSync}`
            : "Discord activity waiting for sync",

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
    },

    shouldSync:
      !lastDiscordSync ||
      Date.now() -
        new Date(
          lastDiscordSync,
        ).getTime() >
        60 * 60 * 1000,

    teams:
      teamReports,
  };
}
