import { findTeamBySlug } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

type GameRow = {
  id: string;
  season: number;
  week: number;
  game_type: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_abbreviation: string | null;
  away_team_abbreviation: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  scheduled_at: string | null;
};

type TeamRow = {
  id: string;
  city: string | null;
  name: string;
  abbreviation: string;
};

type Metrics = {
  games: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;

  pointsFor: number;
  pointsAgainst: number;
  avgFor: number;
  avgAgainst: number;
  pointDiff: number;

  closeGames: number;
  closeWins: number;

  games35: number;
  allowed14: number;

  streakType: "W" | "L" | "T" | null;
  streak: number;

  results: {
    gameId: string;
    season: number;
    week: number;
    opponent: string;
    result: "W" | "L" | "T";
    pf: number;
    pa: number;
    margin: number;
  }[];
};

function clamp(
  value: number,
  min = 0,
  max = 100,
) {
  return Math.max(
    min,
    Math.min(max, value),
  );
}

function recordText(
  metrics: Metrics,
) {
  return metrics.ties
    ? `${metrics.wins}-${metrics.losses}-${metrics.ties}`
    : `${metrics.wins}-${metrics.losses}`;
}

function fullTeamName(
  team: TeamRow | undefined | null,
) {
  if (!team) return "Unknown Team";

  return [
    team.city,
    team.name,
  ]
    .filter(Boolean)
    .join(" ");
}

function metricsForTeam(
  teamId: string,
  games: GameRow[],
): Metrics {
  const completed =
    games
      .filter(
        (game) =>
          game.status === "final" &&
          (
            game.home_team_id === teamId ||
            game.away_team_id === teamId
          ) &&
          game.home_score !== null &&
          game.away_score !== null,
      )
      .sort(
        (a, b) =>
          a.season - b.season ||
          a.week - b.week ||
          String(
            a.scheduled_at ?? "",
          ).localeCompare(
            String(
              b.scheduled_at ?? "",
            ),
          ),
      );

  let wins = 0;
  let losses = 0;
  let ties = 0;

  let pointsFor = 0;
  let pointsAgainst = 0;

  let closeGames = 0;
  let closeWins = 0;

  let games35 = 0;
  let allowed14 = 0;

  const results:
    Metrics["results"] = [];

  for (const game of completed) {
    const home =
      game.home_team_id ===
      teamId;

    const pf =
      Number(
        home
          ? game.home_score
          : game.away_score,
      );

    const pa =
      Number(
        home
          ? game.away_score
          : game.home_score,
      );

    const opponent =
      String(
        home
          ? game.away_team_abbreviation
          : game.home_team_abbreviation,
      ).toUpperCase();

    const margin =
      pf - pa;

    let result:
      "W" | "L" | "T";

    if (margin > 0) {
      wins += 1;
      result = "W";
    } else if (margin < 0) {
      losses += 1;
      result = "L";
    } else {
      ties += 1;
      result = "T";
    }

    pointsFor += pf;
    pointsAgainst += pa;

    if (
      Math.abs(margin) <= 8
    ) {
      closeGames += 1;

      if (margin > 0) {
        closeWins += 1;
      }
    }

    if (pf >= 35) {
      games35 += 1;
    }

    if (pa <= 14) {
      allowed14 += 1;
    }

    results.push({
      gameId:
        game.id,

      season:
        game.season,

      week:
        game.week,

      opponent,

      result,

      pf,

      pa,

      margin,
    });
  }

  const total =
    wins +
    losses +
    ties;

  const avgFor =
    total
      ? pointsFor /
        total
      : 0;

  const avgAgainst =
    total
      ? pointsAgainst /
        total
      : 0;

  const pointDiff =
    total
      ? (
          pointsFor -
          pointsAgainst
        ) /
        total
      : 0;

  let streakType:
    Metrics["streakType"] =
      null;

  let streak = 0;

  for (
    const entry
    of [...results].reverse()
  ) {
    if (!streakType) {
      streakType =
        entry.result;

      streak = 1;

      continue;
    }

    if (
      entry.result ===
      streakType
    ) {
      streak += 1;
    } else {
      break;
    }
  }

  return {
    games:
      total,

    wins,

    losses,

    ties,

    winPct:
      total
        ? (
            wins +
            ties * 0.5
          ) /
          total
        : 0,

    pointsFor,

    pointsAgainst,

    avgFor,

    avgAgainst,

    pointDiff,

    closeGames,

    closeWins,

    games35,

    allowed14,

    streakType,

    streak,

    results,
  };
}

function ownerDNA(
  metrics: Metrics,
) {
  const offense =
    clamp(
      Math.round(
        55 +
        (
          metrics.avgFor -
          21
        ) *
          2.25,
      ),
    );

  const defense =
    clamp(
      Math.round(
        55 +
        (
          21 -
          metrics.avgAgainst
        ) *
          2.25,
      ),
    );

  const clutch =
    metrics.closeGames
      ? clamp(
          Math.round(
            45 +
            (
              metrics.closeWins /
              metrics.closeGames
            ) *
              50,
          ),
        )
      : 70;

  const dominance =
    clamp(
      Math.round(
        55 +
        metrics.pointDiff *
          2.4,
      ),
    );

  const winning =
    clamp(
      Math.round(
        45 +
        metrics.winPct *
          55,
      ),
    );

  const overall =
    Math.round(
      winning * 0.35 +
      offense * 0.2 +
      defense * 0.2 +
      clutch * 0.15 +
      dominance * 0.1,
    );

  let archetype =
    "Wild Card";

  if (
    metrics.winPct >=
      0.8 &&
    dominance >= 80
  ) {
    archetype =
      "Final Boss";
  } else if (
    offense >= 85 &&
    defense >= 80
  ) {
    archetype =
      "Complete Menace";
  } else if (
    offense >= 88
  ) {
    archetype =
      "Scoreboard Terror";
  } else if (
    defense >= 88
  ) {
    archetype =
      "Defensive Sicko";
  } else if (
    clutch >= 88
  ) {
    archetype =
      "Heartbreaker";
  } else if (
    metrics.pointDiff >=
    10
  ) {
    archetype =
      "Front Runner";
  } else if (
    metrics.closeGames >=
    3
  ) {
    archetype =
      "Cardiac Merchant";
  }

  return {
    overall,

    archetype,

    offense,

    defense,

    clutch,

    dominance,

    winning,
  };
}

function personality(
  metrics: Metrics,
) {
  if (
    metrics.avgFor >=
      31 &&
    metrics.avgAgainst >=
      24
  ) {
    return {
      name:
        "SHOOTOUT MERCHANT",

      description:
        "Every game turns into a track meet.",
    };
  }

  if (
    metrics.avgFor >=
    30
  ) {
    return {
      name:
        "SCOREBOARD TERROR",

      description:
        "Lives to put points on the board.",
    };
  }

  if (
    metrics.avgAgainst <=
    17
  ) {
    return {
      name:
        "TRENCH WARFARE",

      description:
        "Wins by making every possession miserable.",
    };
  }

  if (
    metrics.closeGames >=
      3 &&
    metrics.closeWins /
      Math.max(
        1,
        metrics.closeGames,
      ) >=
      0.65
  ) {
    return {
      name:
        "CARDIAC KILLER",

      description:
        "Keeps games close and somehow survives.",
    };
  }

  if (
    metrics.pointDiff >=
    8
  ) {
    return {
      name:
        "BULLY BALL",

      description:
        "Usually controls games from start to finish.",
    };
  }

  if (
    metrics.pointDiff <=
    -8
  ) {
    return {
      name:
        "CHAOS MODE",

      description:
        "Anything can happen when this team loads in.",
    };
  }

  return {
    name:
      "BALANCED",

    description:
      "No single identity dominates the profile.",
  };
}

function fraudProfile(
  metrics: Metrics,
) {
  let score = 0;

  if (
    metrics.winPct >=
    0.6
  ) {
    if (
      metrics.pointDiff <=
      2
    ) {
      score += 40;
    }

    if (
      metrics.avgAgainst >=
      25
    ) {
      score += 15;
    }

    if (
      metrics.wins >= 3 &&
      metrics.closeWins /
        Math.max(
          1,
          metrics.wins,
        ) >=
        0.6
    ) {
      score += 25;
    }

    if (
      metrics.pointDiff <
      0
    ) {
      score += 25;
    }
  }

  score =
    clamp(score);

  let label =
    "LEGIT";

  if (score >= 60) {
    label =
      "🚨 FRAUD WATCH";
  } else if (
    score >= 35
  ) {
    label =
      "👀 SUSPICIOUS";
  }

  return {
    score,
    label,
  };
}

function threatLevel(
  dna: ReturnType<
    typeof ownerDNA
  >,
) {
  if (
    dna.overall >=
    90
  ) {
    return "☠️ EXTREME";
  }

  if (
    dna.overall >=
    82
  ) {
    return "🔴 HIGH";
  }

  if (
    dna.overall >=
    72
  ) {
    return "🟠 ELEVATED";
  }

  if (
    dna.overall >=
    62
  ) {
    return "🟡 MODERATE";
  }

  return "🟢 LOW";
}

function gameWinner(
  game: GameRow,
) {
  if (
    game.home_score === null ||
    game.away_score === null ||
    game.home_score ===
      game.away_score
  ) {
    return null;
  }

  return game.home_score >
    game.away_score
    ? game.home_team_id
    : game.away_team_id;
}

function recapHeadline(
  game: GameRow,
  teamById: Map<
    string,
    TeamRow
  >,
) {
  const winnerId =
    gameWinner(game);

  if (!winnerId) {
    return "GAME ENDS DEAD EVEN";
  }

  const loserId =
    winnerId ===
    game.home_team_id
      ? game.away_team_id
      : game.home_team_id;

  const winner =
    teamById.get(
      String(winnerId),
    );

  const loser =
    teamById.get(
      String(loserId),
    );

  const winnerScore =
    winnerId ===
    game.home_team_id
      ? Number(
          game.home_score,
        )
      : Number(
          game.away_score,
        );

  const loserScore =
    winnerId ===
    game.home_team_id
      ? Number(
          game.away_score,
        )
      : Number(
          game.home_score,
        );

  const margin =
    winnerScore -
    loserScore;

  if (margin >= 21) {
    return `${winner?.name ?? "WINNER"} DESTROYS ${loser?.name ?? "OPPONENT"}`;
  }

  if (margin <= 3) {
    return `${winner?.name ?? "WINNER"} SURVIVES ${loser?.name ?? "OPPONENT"}`;
  }

  if (margin <= 8) {
    return `${winner?.name ?? "WINNER"} ESCAPES WITH THE WIN`;
  }

  return `${winner?.name ?? "WINNER"} TAKES DOWN ${loser?.name ?? "OPPONENT"}`;
}

function rivalry(
  teamId: string,
  opponentId: string,
  games: GameRow[],
) {
  const meetings =
    games
      .filter(
        (game) =>
          game.status ===
            "final" &&
          (
            (
              game.home_team_id ===
                teamId &&
              game.away_team_id ===
                opponentId
            ) ||
            (
              game.home_team_id ===
                opponentId &&
              game.away_team_id ===
                teamId
            )
          ),
      )
      .sort(
        (a, b) =>
          b.season -
            a.season ||
          b.week -
            a.week,
      );

  let teamWins = 0;
  let opponentWins = 0;
  let close = 0;
  let totalMargin = 0;

  for (
    const game
    of meetings
  ) {
    const winner =
      gameWinner(game);

    if (
      winner === teamId
    ) {
      teamWins += 1;
    }

    if (
      winner ===
      opponentId
    ) {
      opponentWins +=
        1;
    }

    const margin =
      Math.abs(
        Number(
          game.home_score ??
            0,
        ) -
        Number(
          game.away_score ??
            0,
        ),
      );

    totalMargin += margin;

    if (margin <= 8) {
      close += 1;
    }
  }

  const heat =
    Math.min(
      5,
      Math.max(
        1,
        Math.round(
          1 +
          meetings.length *
            0.5 +
          close * 0.45,
        ),
      ),
    );

  return {
    meetings:
      meetings.length,

    teamWins,

    opponentWins,

    averageMargin:
      meetings.length
        ? Number(
            (
              totalMargin /
              meetings.length
            ).toFixed(1),
          )
        : 0,

    heat,

    latest:
      meetings[0] ??
      null,
  };
}

function beltLineage(
  games: GameRow[],
  teamById: Map<
    string,
    TeamRow
  >,
  currentSeason: number,
) {
  /*
   * NEW ERA BELT:
   *
   * - Season 1 starts VACANT.
   * - The first completed season's Super Bowl
   *   champion becomes the inaugural holder.
   * - After that, beat the holder = take the belt.
   *
   * We ONLY initialize from a season that is
   * already completely behind the current season.
   * This prevents a regular-season/playoff game
   * from accidentally creating the belt.
   */

  const isPostseason = (
    game: GameRow,
  ) => {
    const type =
      String(
        game.game_type ??
          "",
      ).toLowerCase();

    return (
      type === "postseason" ||
      type === "playoff" ||
      type === "playoffs"
    );
  };

  const pastPostseasonGames =
    games
      .filter(
        (game) =>
          game.season <
            currentSeason &&
          game.status ===
            "final" &&
          isPostseason(game) &&
          Boolean(
            gameWinner(game),
          ),
      );

  /*
   * No completed PRIOR season postseason exists.
   * Therefore the belt has never been awarded.
   */
  if (
    !pastPostseasonGames.length
  ) {
    return null;
  }

  const completedSeasons =
    [
      ...new Set(
        pastPostseasonGames.map(
          (game) =>
            game.season,
        ),
      ),
    ].sort(
      (a, b) =>
        a - b,
    );

  const inauguralSeason =
    completedSeasons[0];

  /*
   * Once we've advanced beyond a season,
   * its highest postseason week is its
   * championship game.
   */
  const championship =
    pastPostseasonGames
      .filter(
        (game) =>
          game.season ===
          inauguralSeason,
      )
      .sort(
        (a, b) =>
          b.week -
            a.week ||
          String(
            b.scheduled_at ??
              "",
          ).localeCompare(
            String(
              a.scheduled_at ??
                "",
            ),
          ),
      )[0];

  if (!championship) {
    return null;
  }

  const inauguralWinner =
    gameWinner(
      championship,
    );

  if (!inauguralWinner) {
    return null;
  }

  let holder =
    String(
      inauguralWinner,
    );

  let defenses = 0;

  const history: {
    season: number;
    week: number;
    from: string | null;
    to: string;
    reason: string;
  }[] = [
    {
      season:
        championship.season,

      week:
        championship.week,

      from:
        null,

      to:
        holder,

      reason:
        "INAUGURAL SUPER BOWL CHAMPION",
    },
  ];

  /*
   * Every legitimate game after the inaugural
   * championship can defend/transfer the belt.
   */
  const laterGames =
    games
      .filter(
        (game) =>
          game.season >
            inauguralSeason &&
          game.status ===
            "final" &&
          String(
            game.game_type ??
              "",
          ).toLowerCase() !==
            "preseason" &&
          Boolean(
            gameWinner(game),
          ),
      )
      .sort(
        (a, b) =>
          a.season -
            b.season ||
          a.week -
            b.week ||
          String(
            a.scheduled_at ??
              "",
          ).localeCompare(
            String(
              b.scheduled_at ??
                "",
            ),
          ),
      );

  for (
    const game
    of laterGames
  ) {
    const holderPlayed =
      game.home_team_id ===
        holder ||
      game.away_team_id ===
        holder;

    if (!holderPlayed) {
      continue;
    }

    const winnerId =
      gameWinner(game);

    if (!winnerId) {
      continue;
    }

    const winner =
      String(
        winnerId,
      );

    if (
      winner === holder
    ) {
      defenses += 1;
      continue;
    }

    const previous =
      holder;

    holder =
      winner;

    defenses = 0;

    history.push({
      season:
        game.season,

      week:
        game.week,

      from:
        previous,

      to:
        holder,

      reason:
        "BELT TRANSFER",
    });
  }

  return {
    holderId:
      holder,

    holder:
      teamById.get(
        holder,
      ) ??
      null,

    defenses,

    history:
      history
        .slice(-10)
        .reverse()
        .map(
          (entry) => ({
            ...entry,

            fromTeam:
              entry.from
                ? fullTeamName(
                    teamById.get(
                      entry.from,
                    ),
                  )
                : "VACANT",

            toTeam:
              fullTeamName(
                teamById.get(
                  entry.to,
                ),
              ),
          }),
        ),
  };
}

function achievements(
  metrics: Metrics,
) {
  const maxWinStreak =
    (() => {
      let current = 0;
      let best = 0;

      for (
        const entry
        of metrics.results
      ) {
        if (
          entry.result ===
          "W"
        ) {
          current += 1;
          best =
            Math.max(
              best,
              current,
            );
        } else {
          current = 0;
        }
      }

      return best;
    })();

  return [
    {
      name:
        "HEARTBREAKER",

      icon:
        "💔",

      description:
        "Win at least 3 one-score games.",

      unlocked:
        metrics.closeWins >=
        3,
    },

    {
      name:
        "SCOREBOARD TERROR",

      icon:
        "💥",

      description:
        "Score 35+ in 3 different games.",

      unlocked:
        metrics.games35 >=
        3,
    },

    {
      name:
        "CLAMP GOD",

      icon:
        "🔒",

      description:
        "Hold opponents to 14 or fewer 3 times.",

      unlocked:
        metrics.allowed14 >=
        3,
    },

    {
      name:
        "STREAK DEMON",

      icon:
        "🔥",

      description:
        "Win 4 straight games.",

      unlocked:
        maxWinStreak >=
        4,
    },

    {
      name:
        "FINAL BOSS",

      icon:
        "👑",

      description:
        "Reach 80% wins with at least 5 games played.",

      unlocked:
        metrics.games >=
          5 &&
        metrics.winPct >=
          0.8,
    },
  ];
}

export async function buildNewEraIntelligence(
  discordId: string,
) {
  const leagueResult =
    await supabaseAdmin
      .from("leagues")
      .select(
        "id, season, current_week",
      )
      .eq(
        "slug",
        "gold-jacket-cfm",
      )
      .maybeSingle();

  if (
    leagueResult.error
  ) {
    throw leagueResult.error;
  }

  if (
    !leagueResult.data
  ) {
    throw new Error(
      "NEW ERA league not found.",
    );
  }

  const league =
    leagueResult.data;

  const [
    teamsResult,
    gamesResult,
    memberResult,
    weeklyResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from("teams")
        .select(
          "id, city, name, abbreviation",
        )
        .eq(
          "league_id",
          league.id,
        ),

      supabaseAdmin
        .from(
          "league_games",
        )
        .select(
          "id, season, week, game_type, home_team_id, away_team_id, home_team_abbreviation, away_team_abbreviation, home_score, away_score, status, scheduled_at",
        )
        .eq(
          "league_id",
          league.id,
        ),

      supabaseAdmin
        .from("members")
        .select(
          "display_name, team",
        )
        .eq(
          "discord_id",
          discordId,
        )
        .maybeSingle(),

      supabaseAdmin
        .from(
          "league_syncs",
        )
        .select(
          "export_type, payload, received_at",
        )
        .eq(
          "source",
          "gold_jacket_weekly",
        )
        .order(
          "received_at",
          {
            ascending:
              false,
          },
        )
        .limit(12),
    ]);

  if (
    teamsResult.error
  ) {
    throw teamsResult.error;
  }

  if (
    gamesResult.error
  ) {
    throw gamesResult.error;
  }

  if (
    memberResult.error
  ) {
    throw memberResult.error;
  }

  if (
    weeklyResult.error
  ) {
    throw weeklyResult.error;
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

  const teamById =
    new Map(
      teams.map(
        (team) => [
          team.id,
          team,
        ],
      ),
    );

  const staticTeam =
    findTeamBySlug(
      memberResult.data
        ?.team ??
        null,
    );

  const myTeam =
    staticTeam
      ? teams.find(
          (team) =>
            team.abbreviation.toUpperCase() ===
            staticTeam.abbreviation.toUpperCase(),
        ) ??
        null
      : null;

  const currentSeasonGames =
    games.filter(
      (game) =>
        game.season ===
        Number(
          league.season ??
            1,
        ),
    );

  const allProfiles =
    teams.map(
      (team) => {
        const metrics =
          metricsForTeam(
            team.id,
            currentSeasonGames,
          );

        return {
          team,

          metrics,

          dna:
            ownerDNA(
              metrics,
            ),

          personality:
            personality(
              metrics,
            ),

          fraud:
            fraudProfile(
              metrics,
            ),
        };
      },
    );

  const profileById =
    new Map(
      allProfiles.map(
        (profile) => [
          profile.team.id,
          profile,
        ],
      ),
    );

  const myProfile =
    myTeam
      ? profileById.get(
          myTeam.id,
        ) ??
        null
      : null;

  const currentGame =
    myTeam
      ? currentSeasonGames.find(
          (game) =>
            game.week ===
              Number(
                league.current_week ??
                  1,
              ) &&
            (
              game.home_team_id ===
                myTeam.id ||
              game.away_team_id ===
                myTeam.id
            ),
        ) ??
        null
      : null;

  const opponentId =
    currentGame &&
    myTeam
      ? (
          currentGame
            .home_team_id ===
          myTeam.id
            ? currentGame
                .away_team_id
            : currentGame
                .home_team_id
        )
      : null;

  const opponentProfile =
    opponentId
      ? profileById.get(
          opponentId,
        ) ??
        null
      : null;

  const rivalryData =
    myTeam &&
    opponentProfile
      ? rivalry(
          myTeam.id,
          opponentProfile
            .team.id,
          games,
        )
      : null;

  const finals =
    currentSeasonGames
      .filter(
        (game) =>
          game.status ===
          "final",
      )
      .sort(
        (a, b) =>
          b.week -
            a.week ||
          String(
            b.scheduled_at ??
              "",
          ).localeCompare(
            String(
              a.scheduled_at ??
                "",
            ),
          ),
      );

  const recaps =
    finals
      .slice(
        0,
        10,
      )
      .map(
        (game) => {
          const home =
            teamById.get(
              String(
                game.home_team_id,
              ),
            );

          const away =
            teamById.get(
              String(
                game.away_team_id,
              ),
            );

          return {
            id:
              game.id,

            season:
              game.season,

            week:
              game.week,

            headline:
              recapHeadline(
                game,
                teamById,
              ),

            home:
              home
                ? {
                    abbreviation:
                      home.abbreviation,
                    name:
                      fullTeamName(
                        home,
                      ),
                    score:
                      Number(
                        game.home_score,
                      ),
                  }
                : null,

            away:
              away
                ? {
                    abbreviation:
                      away.abbreviation,
                    name:
                      fullTeamName(
                        away,
                      ),
                    score:
                      Number(
                        game.away_score,
                      ),
                  }
                : null,
          };
        },
      );

  const belt =
    beltLineage(
      games,
      teamById,
      Number(
        league.season ??
          1,
      ),
    );

  const fraudWatch =
    allProfiles
      .filter(
        (profile) =>
          profile.metrics
            .games >= 3,
      )
      .sort(
        (a, b) =>
          b.fraud.score -
          a.fraud.score,
      )
      .slice(
        0,
        5,
      );

  const universe =
    (
      weeklyResult.data ??
      []
    )
      .map(
        (entry) => {
          const payload =
            (
              entry.payload &&
              typeof entry.payload ===
                "object" &&
              !Array.isArray(
                entry.payload,
              )
                ? entry.payload
                : {}
            ) as Record<
              string,
              unknown
            >;

          const type =
            String(
              entry.export_type ??
                "",
            );

          if (
            type.includes(
              "gotw-posted",
            )
          ) {
            return {
              type:
                "GOTW",

              icon:
                "🔥",

              title:
                `${String(
                  payload.away ??
                    "",
                )} @ ${String(
                  payload.home ??
                    "",
                )} selected as Game of the Week`,

              detail:
                String(
                  payload.reason ??
                    "",
                ),

              date:
                String(
                  entry.received_at ??
                    "",
                ),
            };
          }

          if (
            type.includes(
              "potw-posted",
            )
          ) {
            return {
              type:
                "POTW",

              icon:
                "🏆",

              title:
                `Week ${String(
                  payload.week ??
                    "",
                )} Players of the Week crowned`,

              detail:
                "New Era weekly awards",

              date:
                String(
                  entry.received_at ??
                    "",
                ),
            };
          }

          return null;
        },
      )
      .filter(
        (
          value,
        ): value is {
          type: string;
          icon: string;
          title: string;
          detail: string;
          date: string;
        } =>
          Boolean(value),
      )
      .slice(
        0,
        8,
      );

  const myAchievements =
    myProfile
      ? achievements(
          myProfile.metrics,
        )
      : [];

  const latestMyGame =
    myProfile
      ? [...myProfile.metrics.results]
          .reverse()[0] ??
        null
      : null;

  const wrapped =
    myProfile
      ? {
          record:
            recordText(
              myProfile.metrics,
            ),

          streak:
            myProfile.metrics
              .streakType
              ? `${myProfile.metrics.streakType}${myProfile.metrics.streak}`
              : "—",

          avgPoints:
            Number(
              myProfile.metrics.avgFor.toFixed(
                1,
              ),
            ),

          pointDiff:
            Number(
              myProfile.metrics.pointDiff.toFixed(
                1,
              ),
            ),

          latest:
            latestMyGame,

          dna:
            myProfile.dna,
        }
      : null;

  return {
    revision:
      "new-era-intelligence-v1",

    league: {
      season:
        Number(
          league.season ??
            1,
        ),

      currentWeek:
        Number(
          league.current_week ??
            1,
        ),
    },

    member: {
      displayName:
        memberResult.data
          ?.display_name ??
        null,
    },

    myTeam,

    myProfile,

    currentGame,

    opponent:
      opponentProfile
        ? {
            ...opponentProfile,

            threat:
              threatLevel(
                opponentProfile.dna,
              ),
          }
        : null,

    rivalry:
      rivalryData,

    belt,

    fraudWatch,

    recaps,

    universe,

    achievements:
      myAchievements,

    wrapped,

    allProfiles,
  };
}
