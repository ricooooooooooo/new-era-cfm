import { supabaseAdmin } from "@/lib/supabase-admin";

type TeamRow = {
  id: string;
  city: string | null;
  name: string;
  abbreviation: string;
};

type GameRow = {
  id: string;
  week: number;
  scheduled_at: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
};

const DIVISIONS = [
  { conference: "AFC", division: "East", teams: ["BUF", "MIA", "NE", "NYJ"] },
  { conference: "AFC", division: "North", teams: ["BAL", "CIN", "CLE", "PIT"] },
  { conference: "AFC", division: "South", teams: ["HOU", "IND", "JAX", "TEN"] },
  { conference: "AFC", division: "West", teams: ["DEN", "KC", "LV", "LAC"] },
  { conference: "NFC", division: "East", teams: ["DAL", "NYG", "PHI", "WAS"] },
  { conference: "NFC", division: "North", teams: ["CHI", "DET", "GB", "MIN"] },
  { conference: "NFC", division: "South", teams: ["ATL", "CAR", "NO", "TB"] },
  { conference: "NFC", division: "West", teams: ["ARI", "LAR", "SF", "SEA"] },
] as const;

type TeamContext = {
  conference: (typeof DIVISIONS)[number]["conference"];
  division: (typeof DIVISIONS)[number]["division"];
};

const TEAM_CONTEXT = new Map<string, TeamContext>(
  DIVISIONS.flatMap((group) =>
    group.teams.map(
      (team): [string, TeamContext] => [
        team,
        { conference: group.conference, division: group.division },
      ],
    ),
  ),
);

export type StandingTeam = {
  id: string;
  city: string | null;
  name: string;
  abbreviation: string;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  divisionWins: number;
  divisionLosses: number;
  divisionTies: number;
  conferenceWins: number;
  conferenceLosses: number;
  conferenceTies: number;
  streak: string;
  gamesBehind: number;
};

type MutableRecord = StandingTeam & {
  outcomes: Array<{ week: number; scheduledAt: string | null; result: "W" | "L" | "T" }>;
};

function emptyRecord(team: TeamRow): MutableRecord {
  return {
    ...team,
    wins: 0,
    losses: 0,
    ties: 0,
    winPct: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDifferential: 0,
    divisionWins: 0,
    divisionLosses: 0,
    divisionTies: 0,
    conferenceWins: 0,
    conferenceLosses: 0,
    conferenceTies: 0,
    streak: "—",
    gamesBehind: 0,
    outcomes: [],
  };
}

function applyResult(
  record: MutableRecord,
  opponent: MutableRecord,
  pointsFor: number,
  pointsAgainst: number,
  week: number,
  scheduledAt: string | null,
) {
  record.pointsFor += pointsFor;
  record.pointsAgainst += pointsAgainst;

  const teamContext = TEAM_CONTEXT.get(record.abbreviation);
  const opponentContext = TEAM_CONTEXT.get(opponent.abbreviation);
  const sameConference =
    teamContext && opponentContext && teamContext.conference === opponentContext.conference;
  const sameDivision =
    sameConference && teamContext?.division === opponentContext?.division;

  let result: "W" | "L" | "T";

  if (pointsFor > pointsAgainst) {
    record.wins += 1;
    result = "W";
    if (sameConference) record.conferenceWins += 1;
    if (sameDivision) record.divisionWins += 1;
  } else if (pointsFor < pointsAgainst) {
    record.losses += 1;
    result = "L";
    if (sameConference) record.conferenceLosses += 1;
    if (sameDivision) record.divisionLosses += 1;
  } else {
    record.ties += 1;
    result = "T";
    if (sameConference) record.conferenceTies += 1;
    if (sameDivision) record.divisionTies += 1;
  }

  record.outcomes.push({ week, scheduledAt, result });
}

function calculateStreak(outcomes: MutableRecord["outcomes"]) {
  if (outcomes.length === 0) return "—";

  const sorted = [...outcomes].sort((a, b) => {
    const weekDifference = b.week - a.week;
    if (weekDifference !== 0) return weekDifference;
    return Date.parse(b.scheduledAt ?? "") - Date.parse(a.scheduledAt ?? "");
  });

  const latest = sorted[0].result;
  let count = 0;
  for (const outcome of sorted) {
    if (outcome.result !== latest) break;
    count += 1;
  }

  return `${latest}${count}`;
}

function pct(wins: number, losses: number, ties: number) {
  const games = wins + losses + ties;
  return games === 0 ? 0 : (wins + ties * 0.5) / games;
}

function divisionPct(team: StandingTeam) {
  return pct(team.divisionWins, team.divisionLosses, team.divisionTies);
}

function conferencePct(team: StandingTeam) {
  return pct(team.conferenceWins, team.conferenceLosses, team.conferenceTies);
}

export async function getLeagueStandings() {
  const leagueResult = await supabaseAdmin
    .from("leagues")
    .select("id, name, season, current_week")
    .eq("slug", "new-era-cfm")
    .maybeSingle();

  if (leagueResult.error) throw leagueResult.error;

  const teamResult = await supabaseAdmin
    .from("teams")
    .select("id, city, name, abbreviation");

  if (teamResult.error) throw teamResult.error;

  const teams = (teamResult.data ?? []) as TeamRow[];
  const league = leagueResult.data;
  const season = Number(league?.season ?? 1);

  const gamesResult = league
    ? await supabaseAdmin
        .from("league_games")
        .select("id, week, scheduled_at, home_team_id, away_team_id, home_score, away_score")
        .eq("league_id", league.id)
        .eq("season", season)
        .eq("status", "final")
    : { data: [], error: null };

  if (gamesResult.error) throw gamesResult.error;

  const records = new Map(teams.map((team) => [team.id, emptyRecord(team)]));

  for (const game of (gamesResult.data ?? []) as GameRow[]) {
    if (
      !game.home_team_id ||
      !game.away_team_id ||
      game.home_score === null ||
      game.away_score === null
    ) {
      continue;
    }

    const home = records.get(game.home_team_id);
    const away = records.get(game.away_team_id);
    if (!home || !away) continue;

    applyResult(
      home,
      away,
      game.home_score,
      game.away_score,
      game.week,
      game.scheduled_at,
    );
    applyResult(
      away,
      home,
      game.away_score,
      game.home_score,
      game.week,
      game.scheduled_at,
    );
  }

  const finalized = new Map<string, StandingTeam>();

  for (const record of records.values()) {
    const gamesPlayed = record.wins + record.losses + record.ties;
    finalized.set(record.abbreviation, {
      id: record.id,
      city: record.city,
      name: record.name,
      abbreviation: record.abbreviation,
      wins: record.wins,
      losses: record.losses,
      ties: record.ties,
      winPct: gamesPlayed === 0 ? 0 : (record.wins + record.ties * 0.5) / gamesPlayed,
      pointsFor: record.pointsFor,
      pointsAgainst: record.pointsAgainst,
      pointDifferential: record.pointsFor - record.pointsAgainst,
      divisionWins: record.divisionWins,
      divisionLosses: record.divisionLosses,
      divisionTies: record.divisionTies,
      conferenceWins: record.conferenceWins,
      conferenceLosses: record.conferenceLosses,
      conferenceTies: record.conferenceTies,
      streak: calculateStreak(record.outcomes),
      gamesBehind: 0,
    });
  }

  const divisions = DIVISIONS.map((group) => {
    const divisionTeams = group.teams
      .map((abbreviation) => finalized.get(abbreviation))
      .filter((team): team is StandingTeam => Boolean(team))
      .sort((a, b) =>
        b.winPct - a.winPct ||
        divisionPct(b) - divisionPct(a) ||
        conferencePct(b) - conferencePct(a) ||
        b.pointDifferential - a.pointDifferential ||
        a.name.localeCompare(b.name),
      );

    const leader = divisionTeams[0];
    if (leader) {
      for (const team of divisionTeams) {
        team.gamesBehind = Math.max(
          0,
          (leader.wins - team.wins + team.losses - leader.losses) / 2,
        );
      }
    }

    return {
      conference: group.conference,
      division: group.division,
      teams: divisionTeams,
    };
  });

  return {
    league: league
      ? {
          id: league.id,
          name: league.name ?? "NEW ERA CFM",
          season,
          currentWeek: Number(league.current_week ?? 1),
        }
      : null,
    finalGameCount: (gamesResult.data ?? []).length,
    divisions,
  };
}
