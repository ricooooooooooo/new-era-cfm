import { supabaseAdmin } from "@/lib/supabase-admin";

type Row = Record<string, unknown>;

function record(
  value: unknown,
): Row {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as Row
    : {};
}

function rows(
  value: unknown,
): Row[] {
  return Array.isArray(value)
    ? value.filter(
        (
          item,
        ): item is Row =>
          Boolean(item) &&
          typeof item ===
            "object" &&
          !Array.isArray(
            item,
          ),
      )
    : [];
}

function text(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

function number(
  value: unknown,
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

function recordText(
  wins: number,
  losses: number,
  ties: number,
) {
  return ties
    ? `${wins}-${losses}-${ties}`
    : `${wins}-${losses}`;
}

export type SiteAward = {
  label: string;
  playerName: string;
  team: string | null;
  defensive: boolean;
  statLine: string;
};

export type SiteGotw = {
  week: number;
  reason: string;

  away: {
    abbreviation: string;
    city: string;
    name: string;
    record: string;
  };

  home: {
    abbreviation: string;
    city: string;
    name: string;
    record: string;
  };
};

async function latestMarker(
  exportType: string,
) {
  const result =
    await supabaseAdmin
      .from("league_syncs")
      .select(
        "payload, received_at",
      )
      .eq(
        "source",
        "new_era_weekly",
      )
      .eq(
        "export_type",
        exportType,
      )
      .order(
        "received_at",
        {
          ascending:
            false,
        },
      )
      .limit(1);

  if (result.error) {
    throw result.error;
  }

  return record(
    result.data?.[0]
      ?.payload,
  );
}

export async function loadSiteWeeklyHighlights() {
  const leagueResult =
    await supabaseAdmin
      .from("leagues")
      .select(
        "id, season, current_week",
      )
      .eq(
        "slug",
        "new-era-cfm",
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
    return {
      season: 1,
      currentWeek: 1,
      gotw: null,
      potw: null,
    };
  }

  const league =
    leagueResult.data;

  const season =
    Number(
      league.season ??
        1,
    );

  const currentWeek =
    Number(
      league.current_week ??
        1,
    );

  const potwWeek =
    Math.max(
      1,
      currentWeek - 1,
    );

  const [
    gotwPayload,
    potwPayload,
    teamsResult,
    snapshotsResult,
    gamesResult,
  ] =
    await Promise.all([
      latestMarker(
        `season-${season}-week-${currentWeek}-gotw-posted`,
      ),

      latestMarker(
        `season-${season}-week-${potwWeek}-potw-posted`,
      ),

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
          "madden_team_snapshots",
        )
        .select(
          "team_id, attributes, captured_at",
        )
        .eq(
          "league_id",
          league.id,
        )
        .eq(
          "source",
          "ea_franchise",
        )
        .order(
          "captured_at",
          {
            ascending:
              false,
          },
        ),

      supabaseAdmin
        .from(
          "league_games",
        )
        .select(
          "week, home_team_abbreviation, away_team_abbreviation, home_score, away_score, status",
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
        .eq(
          "status",
          "final",
        )
        .lt(
          "week",
          currentWeek,
        ),
    ]);

  if (
    teamsResult.error
  ) {
    throw teamsResult.error;
  }

  if (
    snapshotsResult.error
  ) {
    throw snapshotsResult.error;
  }

  if (
    gamesResult.error
  ) {
    throw gamesResult.error;
  }

  const teams =
    teamsResult.data ??
    [];

  const teamByAbbr =
    new Map(
      teams.map(
        (team) => [
          String(
            team.abbreviation,
          ).toUpperCase(),
          team,
        ],
      ),
    );

  /*
   * Map EA's numeric team ID to
   * our NFL abbreviation for POTW.
   */
  const latestSnapshotByTeam =
    new Map<
      string,
      Row
    >();

  for (
    const snapshot
    of snapshotsResult.data ??
      []
  ) {
    const id =
      String(
        snapshot.team_id,
      );

    if (
      !latestSnapshotByTeam.has(
        id,
      )
    ) {
      latestSnapshotByTeam.set(
        id,
        record(
          snapshot.attributes,
        ),
      );
    }
  }

  const eaTeamToAbbr =
    new Map<
      number,
      string
    >();

  for (
    const team
    of teams
  ) {
    const attributes =
      latestSnapshotByTeam.get(
        String(team.id),
      );

    const eaTeamId =
      number(
        attributes
          ?.eaTeamId,
      );

    if (
      eaTeamId
    ) {
      eaTeamToAbbr.set(
        eaTeamId,
        String(
          team.abbreviation,
        ).toUpperCase(),
      );
    }
  }

  /*
   * Build team records for the GOTW
   * matchup from games already completed.
   */
  const standings =
    new Map<
      string,
      {
        wins: number;
        losses: number;
        ties: number;
      }
    >();

  function standing(
    abbreviation: string,
  ) {
    if (
      !standings.has(
        abbreviation,
      )
    ) {
      standings.set(
        abbreviation,
        {
          wins: 0,
          losses: 0,
          ties: 0,
        },
      );
    }

    return standings.get(
      abbreviation,
    )!;
  }

  for (
    const game
    of gamesResult.data ??
      []
  ) {
    const home =
      String(
        game.home_team_abbreviation ??
          "",
      ).toUpperCase();

    const away =
      String(
        game.away_team_abbreviation ??
          "",
      ).toUpperCase();

    if (
      !home ||
      !away
    ) {
      continue;
    }

    const homeScore =
      Number(
        game.home_score ??
          0,
      );

    const awayScore =
      Number(
        game.away_score ??
          0,
      );

    const homeStanding =
      standing(home);

    const awayStanding =
      standing(away);

    if (
      homeScore >
      awayScore
    ) {
      homeStanding.wins +=
        1;

      awayStanding.losses +=
        1;
    } else if (
      awayScore >
      homeScore
    ) {
      awayStanding.wins +=
        1;

      homeStanding.losses +=
        1;
    } else {
      homeStanding.ties +=
        1;

      awayStanding.ties +=
        1;
    }
  }

  let gotw:
    SiteGotw | null =
      null;

  const awayAbbr =
    text(
      gotwPayload.away,
    ).toUpperCase();

  const homeAbbr =
    text(
      gotwPayload.home,
    ).toUpperCase();

  if (
    awayAbbr &&
    homeAbbr
  ) {
    const awayTeam =
      teamByAbbr.get(
        awayAbbr,
      );

    const homeTeam =
      teamByAbbr.get(
        homeAbbr,
      );

    const awayStanding =
      standing(
        awayAbbr,
      );

    const homeStanding =
      standing(
        homeAbbr,
      );

    gotw = {
      week:
        number(
          gotwPayload.week,
        ) ||
        currentWeek,

      reason:
        text(
          gotwPayload.reason,
        ) ||
        "Game of the Week",

      away: {
        abbreviation:
          awayAbbr,

        city:
          String(
            awayTeam
              ?.city ??
              "",
          ),

        name:
          String(
            awayTeam
              ?.name ??
              awayAbbr,
          ),

        record:
          recordText(
            awayStanding.wins,
            awayStanding.losses,
            awayStanding.ties,
          ),
      },

      home: {
        abbreviation:
          homeAbbr,

        city:
          String(
            homeTeam
              ?.city ??
              "",
          ),

        name:
          String(
            homeTeam
              ?.name ??
              homeAbbr,
          ),

        record:
          recordText(
            homeStanding.wins,
            homeStanding.losses,
            homeStanding.ties,
          ),
      },
    };
  }

  const awards:
    SiteAward[] =
      rows(
        potwPayload.awards,
      ).map(
        (
          award,
        ) => {
          const player =
            record(
              award.player,
            );

          const label =
            text(
              award.label,
            );

          const defensive =
            label
              .toLowerCase()
              .includes(
                "defensive",
              );

          const team =
            eaTeamToAbbr.get(
              number(
                player.teamId,
              ),
            ) ??
            null;

          const parts:
            string[] =
              [];

          if (
            defensive
          ) {
            const tackles =
              number(
                player.tackles,
              );

            const sacks =
              number(
                player.sacks,
              );

            const interceptions =
              number(
                player.interceptions,
              );

            const ff =
              number(
                player.forcedFumbles,
              );

            const td =
              number(
                player.defensiveTDs,
              );

            if (tackles) {
              parts.push(
                `${tackles} TKL`,
              );
            }

            if (sacks) {
              parts.push(
                `${sacks.toFixed(
                  1,
                )} SACK`,
              );
            }

            if (
              interceptions
            ) {
              parts.push(
                `${interceptions} INT`,
              );
            }

            if (ff) {
              parts.push(
                `${ff} FF`,
              );
            }

            if (td) {
              parts.push(
                `${td} TD`,
              );
            }
          } else {
            const passYds =
              number(
                player.passYds,
              );

            const passTDs =
              number(
                player.passTDs,
              );

            const passInts =
              number(
                player.passInts,
              );

            const rushYds =
              number(
                player.rushYds,
              );

            const rushTDs =
              number(
                player.rushTDs,
              );

            const catches =
              number(
                player.recCatches,
              );

            const recYds =
              number(
                player.recYds,
              );

            const recTDs =
              number(
                player.recTDs,
              );

            if (passYds) {
              parts.push(
                `${passYds} PASS YDS`,
              );
            }

            if (passTDs) {
              parts.push(
                `${passTDs} PASS TD`,
              );
            }

            if (passInts) {
              parts.push(
                `${passInts} INT`,
              );
            }

            if (rushYds) {
              parts.push(
                `${rushYds} RUSH YDS`,
              );
            }

            if (rushTDs) {
              parts.push(
                `${rushTDs} RUSH TD`,
              );
            }

            if (catches) {
              parts.push(
                `${catches} REC`,
              );
            }

            if (recYds) {
              parts.push(
                `${recYds} REC YDS`,
              );
            }

            if (recTDs) {
              parts.push(
                `${recTDs} REC TD`,
              );
            }
          }

          return {
            label,

            playerName:
              text(
                player.name,
              ) ||
              "Unknown Player",

            team,

            defensive,

            statLine:
              parts.join(
                " • ",
              ),
          };
        },
      );

  return {
    season,
    currentWeek,

    gotw,

    potw:
      awards.length
        ? {
            week:
              number(
                potwPayload.week,
              ) ||
              potwWeek,

            awards,
          }
        : null,
  };
}
