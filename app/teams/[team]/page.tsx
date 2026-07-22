import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "../../components/layout/AppLayout";
import { getTeamBySlug, teams } from "../../data/teams";

type TeamPageProps = {
  params: Promise<{
    team: string;
  }>;
};

const upcomingGames = [
  {
    week: "Week 8",
    location: "Home",
    opponent: "Conference Opponent",
    time: "8:20 PM",
  },
  {
    week: "Week 9",
    location: "Away",
    opponent: "Division Opponent",
    time: "4:25 PM",
  },
  {
    week: "Week 10",
    location: "Home",
    opponent: "Interconference Opponent",
    time: "1:00 PM",
  },
];

const rosterPreview = [
  {
    position: "QB",
    label: "Starting Quarterback",
    overall: 94,
  },
  {
    position: "HB",
    label: "Featured Running Back",
    overall: 91,
  },
  {
    position: "WR",
    label: "Top Wide Receiver",
    overall: 93,
  },
  {
    position: "EDGE",
    label: "Defensive Playmaker",
    overall: 92,
  },
];

export function generateStaticParams() {
  return teams.map((team) => ({
    team: team.slug,
  }));
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);

  if (!team) {
    notFound();
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
        >
          <span>←</span>
          Back to all teams
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
          <div
            className="px-8 py-10"
            style={{
              background: `linear-gradient(120deg, ${team.primaryColor}DD, ${team.secondaryColor}99 45%, #09090b 88%)`,
            }}
          >
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div
                  className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border-2 text-3xl font-black text-white shadow-2xl"
                  style={{
                    borderColor: team.secondaryColor,
                    backgroundColor: team.primaryColor,
                  }}
                >
                  {team.short}
                </div>

                <div>
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-white/70">
                    {team.division}
                  </p>

                  <h1 className="mt-2 text-5xl font-black tracking-tight">
                    {team.city} {team.name}
                  </h1>

                  <p className="mt-3 text-white/70">{team.stadium}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-8 rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-white/50">
                    Record
                  </p>
                  <p className="mt-2 text-4xl font-black">{team.record}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-white/50">
                    Owner
                  </p>
                  <p className="mt-2 text-2xl font-black">{team.owner}</p>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto border-t border-zinc-800 px-6 py-4">
            {[
              "Overview",
              "Roster",
              "Schedule",
              "Stats",
              "Depth Chart",
              "Contracts",
              "Draft Picks",
            ].map((item, index) => (
              <button
                key={item}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition ${
                  index === 0
                    ? "bg-red-600 text-white"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              Offense Rank
            </p>
            <p className="mt-3 text-4xl font-black">
              #{team.offenseRank}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              Defense Rank
            </p>
            <p className="mt-3 text-4xl font-black">
              #{team.defenseRank}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              Points Per Game
            </p>
            <p className="mt-3 text-4xl font-black">
              {team.pointsPerGame}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              Salary Cap
            </p>
            <p className="mt-3 text-4xl font-black">{team.capSpace}</p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
                  Franchise Roster
                </p>

                <h2 className="mt-2 text-3xl font-black">Top Players</h2>
              </div>

              <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-black text-zinc-500">
                M27 DATA
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {rosterPreview.map((player) => (
                <div
                  key={player.position}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black text-white"
                      style={{
                        backgroundColor: team.primaryColor,
                      }}
                    >
                      {player.position}
                    </div>

                    <div>
                      <p className="font-black">{player.label}</p>
                      <p className="mt-1 text-xs font-bold text-zinc-500">
                        Player data will sync from the league
                      </p>
                    </div>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-lg font-black">
                    {player.overall}
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-5 w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-300 transition hover:border-red-600 hover:bg-red-600 hover:text-white">
              View Full Roster
            </button>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
              Upcoming
            </p>

            <h2 className="mt-2 text-3xl font-black">Schedule</h2>

            <div className="mt-6 space-y-3">
              {upcomingGames.map((game) => (
                <div
                  key={game.week}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-red-500">
                        {game.week}
                      </p>

                      <p className="mt-2 font-black">{game.opponent}</p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {game.location} · {game.time}
                      </p>
                    </div>

                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black text-white"
                      style={{
                        backgroundColor: team.primaryColor,
                      }}
                    >
                      {team.short}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-5 w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-300 transition hover:border-red-600 hover:bg-red-600 hover:text-white">
              Full Team Schedule
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Conference
            </p>
            <p className="mt-3 text-2xl font-black">
              {team.conference}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Division
            </p>
            <p className="mt-3 text-2xl font-black">{team.division}</p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Franchise Status
            </p>
            <p
              className={`mt-3 text-2xl font-black ${
                team.owner === "Open"
                  ? "text-red-500"
                  : "text-emerald-400"
              }`}
            >
              {team.owner === "Open" ? "Available" : "Claimed"}
            </p>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}