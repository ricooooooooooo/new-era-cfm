const leagueStats = [
  {
    label: "Season",
    value: "2",
    detail: "Regular Season",
  },
  {
    label: "Current Week",
    value: "8",
    detail: "Advance in 2 days",
  },
  {
    label: "Active Users",
    value: "32",
    detail: "Full league",
  },
  {
    label: "Games Played",
    value: "108",
    detail: "This season",
  },
];

const topPerformers = [
  {
    position: "QB",
    name: "Lamar Jackson",
    team: "BAL",
    stat: "2,241 YDS",
  },
  {
    position: "RB",
    name: "Bijan Robinson",
    team: "ATL",
    stat: "892 YDS",
  },
  {
    position: "WR",
    name: "Justin Jefferson",
    team: "MIN",
    stat: "741 YDS",
  },
];

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 bg-gradient-to-r from-red-950/60 via-zinc-950 to-zinc-950 px-8 py-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-red-500">
                Madden Connected Franchise
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-6xl">
                New Era CFM
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-400">
                Your complete league headquarters for standings, schedules,
                trades, statistics, rankings, and commissioner updates.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-300">
                  Season 2
                </span>

                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-300">
                  Week 8
                </span>

                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-300">
                  32 Teams
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5 lg:min-w-64">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
                Next Advance
              </p>

              <p className="mt-2 text-3xl font-black">Tuesday</p>

              <p className="mt-1 text-sm text-zinc-400">
                9:00 PM Eastern
              </p>

              <button className="mt-5 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-black transition hover:bg-red-500">
                Enter League
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-zinc-800 sm:grid-cols-2 xl:grid-cols-4">
          {leagueStats.map((stat) => (
            <div key={stat.label} className="bg-zinc-950 px-6 py-6">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                {stat.label}
              </p>

              <p className="mt-2 text-4xl font-black">{stat.value}</p>

              <p className="mt-2 text-sm text-zinc-500">{stat.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
                Game of the Week
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Featured Matchup
              </h2>
            </div>

            <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-400">
              Sunday Night
            </span>
          </div>

          <div className="mt-8 grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-950 text-2xl font-black text-purple-300">
                BAL
              </div>

              <h3 className="mt-4 text-2xl font-black">Ravens</h3>

              <p className="mt-1 text-sm text-zinc-500">6-1</p>
            </div>

            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-600">
                Week 8
              </p>

              <p className="mt-2 text-3xl font-black text-red-500">VS</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-950 text-2xl font-black text-red-300">
                KC
              </div>

              <h3 className="mt-4 text-2xl font-black">Chiefs</h3>

              <p className="mt-1 text-sm text-zinc-500">7-0</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-black/30 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold">Prime-time undefeated test</p>
              <p className="mt-1 text-sm text-zinc-500">
                Two AFC contenders meet in the league&apos;s biggest game.
              </p>
            </div>

            <button className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white">
              View Matchup
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
            League Leaders
          </p>

          <h2 className="mt-2 text-3xl font-black">Top Performers</h2>

          <div className="mt-6 space-y-3">
            {topPerformers.map((player, index) => (
              <div
                key={player.name}
                className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-sm font-black text-zinc-400">
                    {index + 1}
                  </div>

                  <div>
                    <p className="font-black">{player.name}</p>
                    <p className="mt-1 text-xs font-bold text-zinc-500">
                      {player.position} · {player.team}
                    </p>
                  </div>
                </div>

                <p className="text-sm font-black text-red-500">
                  {player.stat}
                </p>
              </div>
            ))}
          </div>

          <button className="mt-5 w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white">
            View All Statistics
          </button>
        </div>
      </section>
    </div>
  );
}