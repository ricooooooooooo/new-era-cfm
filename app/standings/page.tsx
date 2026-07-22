import AppLayout from "../components/layout/AppLayout";

const afcTeams = [
  { rank: 1, team: "Kansas City Chiefs", short: "KC", division: "AFC West", wins: 7, losses: 0, ties: 0, pct: ".1000", streak: "W7" },
  { rank: 2, team: "Baltimore Ravens", short: "BAL", division: "AFC North", wins: 6, losses: 1, ties: 0, pct: ".857", streak: "W4" },
  { rank: 3, team: "Buffalo Bills", short: "BUF", division: "AFC East", wins: 5, losses: 2, ties: 0, pct: ".714", streak: "W2" },
  { rank: 4, team: "Houston Texans", short: "HOU", division: "AFC South", wins: 5, losses: 2, ties: 0, pct: ".714", streak: "L1" },
  { rank: 5, team: "Miami Dolphins", short: "MIA", division: "AFC East", wins: 4, losses: 3, ties: 0, pct: ".571", streak: "W1" },
  { rank: 6, team: "Cincinnati Bengals", short: "CIN", division: "AFC North", wins: 4, losses: 3, ties: 0, pct: ".571", streak: "W3" },
  { rank: 7, team: "Los Angeles Chargers", short: "LAC", division: "AFC West", wins: 4, losses: 3, ties: 0, pct: ".571", streak: "L1" },
  { rank: 8, team: "New York Jets", short: "NYJ", division: "AFC East", wins: 3, losses: 4, ties: 0, pct: ".429", streak: "L2" },
];

const nfcTeams = [
  { rank: 1, team: "Philadelphia Eagles", short: "PHI", division: "NFC East", wins: 7, losses: 0, ties: 0, pct: ".1000", streak: "W7" },
  { rank: 2, team: "Detroit Lions", short: "DET", division: "NFC North", wins: 6, losses: 1, ties: 0, pct: ".857", streak: "W5" },
  { rank: 3, team: "San Francisco 49ers", short: "SF", division: "NFC West", wins: 5, losses: 2, ties: 0, pct: ".714", streak: "W2" },
  { rank: 4, team: "Atlanta Falcons", short: "ATL", division: "NFC South", wins: 5, losses: 2, ties: 0, pct: ".714", streak: "L1" },
  { rank: 5, team: "Dallas Cowboys", short: "DAL", division: "NFC East", wins: 4, losses: 3, ties: 0, pct: ".571", streak: "W1" },
  { rank: 6, team: "Green Bay Packers", short: "GB", division: "NFC North", wins: 4, losses: 3, ties: 0, pct: ".571", streak: "W2" },
  { rank: 7, team: "Seattle Seahawks", short: "SEA", division: "NFC West", wins: 4, losses: 3, ties: 0, pct: ".571", streak: "L1" },
  { rank: 8, team: "Tampa Bay Buccaneers", short: "TB", division: "NFC South", wins: 3, losses: 4, ties: 0, pct: ".429", streak: "L2" },
];

type Team = {
  rank: number;
  team: string;
  short: string;
  division: string;
  wins: number;
  losses: number;
  ties: number;
  pct: string;
  streak: string;
};

function StandingsTable({
  title,
  teams,
}: {
  title: string;
  teams: Team[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
            Conference
          </p>

          <h2 className="mt-1 text-2xl font-black">{title}</h2>
        </div>

        <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-400">
          Week 8
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              <th className="px-5 py-4">Rank</th>
              <th className="px-5 py-4">Team</th>
              <th className="px-5 py-4 text-center">W</th>
              <th className="px-5 py-4 text-center">L</th>
              <th className="px-5 py-4 text-center">T</th>
              <th className="px-5 py-4 text-center">PCT</th>
              <th className="px-5 py-4 text-right">Streak</th>
            </tr>
          </thead>

          <tbody>
            {teams.map((team) => (
              <tr
                key={team.team}
                className="border-b border-zinc-900 transition last:border-none hover:bg-zinc-900/60"
              >
                <td className="px-5 py-4">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black ${
                      team.rank <= 4
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {team.rank}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-sm font-black">
                      {team.short}
                    </div>

                    <div>
                      <p className="font-black text-white">{team.team}</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">
                        {team.division}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4 text-center font-black">
                  {team.wins}
                </td>

                <td className="px-5 py-4 text-center text-zinc-400">
                  {team.losses}
                </td>

                <td className="px-5 py-4 text-center text-zinc-400">
                  {team.ties}
                </td>

                <td className="px-5 py-4 text-center font-bold text-zinc-300">
                  {team.pct}
                </td>

                <td className="px-5 py-4 text-right">
                  <span
                    className={`rounded-lg px-3 py-2 text-xs font-black ${
                      team.streak.startsWith("W")
                        ? "bg-emerald-950 text-emerald-400"
                        : "bg-red-950 text-red-400"
                    }`}
                  >
                    {team.streak}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StandingsPage() {
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-red-500">
              New Era CFM
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-tight">
              League Standings
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Track the playoff race, conference leaders, records, and current
              winning streaks.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black transition hover:bg-red-500">
              Overall
            </button>

            <button className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-bold text-zinc-400 transition hover:text-white">
              Divisions
            </button>
          </div>
        </section>

        <section className="grid gap-6">
          <StandingsTable title="AFC Standings" teams={afcTeams} />
          <StandingsTable title="NFC Standings" teams={nfcTeams} />
        </section>
      </main>
    </AppLayout>
  );
}