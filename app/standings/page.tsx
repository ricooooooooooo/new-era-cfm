import Image from "next/image";
import Link from "next/link";
import AppLayout from "../components/layout/AppLayout";
import { getLeagueStandings } from "@/lib/madden/standings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function teamLogo(abbreviation: string) {
  return `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${abbreviation}`;
}

function recordLabel(team: {
  wins: number;
  losses: number;
  ties: number;
}) {
  return team.ties > 0
    ? `${team.wins}-${team.losses}-${team.ties}`
    : `${team.wins}-${team.losses}`;
}

function percentage(value: number) {
  if (value === 0) return ".000";
  return value.toFixed(3).replace(/^0/, "");
}

function gamesBehind(value: number) {
  if (value === 0) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default async function StandingsPage() {
  const data = await getLeagueStandings();

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <header className="rounded-[28px] border border-white/10 bg-[#0d0f12] p-7 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
            {data.league ? `Season ${data.league.season} · Week ${data.league.currentWeek}` : "Season One"}
          </p>
          <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                League Standings
              </h1>
              <p className="mt-4 max-w-2xl text-zinc-400">
                Records update from the same Gold Jacket game feed used by the schedule and prediction markets.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/schedule" className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white hover:bg-white/[0.07]">
                Schedule
              </Link>
              <Link href="/commissioner/madden-sync" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-black hover:bg-zinc-200">
                Madden Sync
              </Link>
            </div>
          </div>
        </header>

        {data.finalGameCount === 0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-purple-400/20 bg-purple-400/[0.045] p-8 text-center">
            <p className="text-xl font-black text-white">Standings are ready.</p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
              Enter the first final score in Commissioner Madden Sync and all eight divisions will update immediately.
            </p>
          </section>
        ) : null}

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          {data.divisions.map((division) => (
            <article key={`${division.conference}-${division.division}`} className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0d0f12]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">{division.conference}</p>
                  <h2 className="text-2xl font-black text-white">{division.division}</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
                  {division.teams.some((team) => team.wins + team.losses + team.ties > 0) ? "Live" : "Ready"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead className="border-b border-white/5 bg-black/20 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
                    <tr>
                      <th className="px-5 py-3 sm:px-6">Team</th>
                      <th className="px-3 py-3 text-center">Record</th>
                      <th className="px-3 py-3 text-center">Pct</th>
                      <th className="px-3 py-3 text-center">GB</th>
                      <th className="px-3 py-3 text-center">PF</th>
                      <th className="px-3 py-3 text-center">PA</th>
                      <th className="px-3 py-3 text-center">Diff</th>
                      <th className="px-5 py-3 text-center sm:px-6">Strk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {division.teams.map((team, index) => (
                      <tr key={team.id} className="border-t border-white/5 transition hover:bg-white/[0.03]">
                        <td className="px-5 py-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <span className="w-4 text-xs font-black text-zinc-700">{index + 1}</span>
                            <div className="relative h-10 w-10 shrink-0">
                              <Image
                                src={teamLogo(team.abbreviation)}
                                alt={`${team.city ?? ""} ${team.name}`}
                                fill
                                unoptimized
                                sizes="40px"
                                className="object-contain"
                              />
                            </div>
                            <div>
                              <p className="font-black text-white">{team.city} {team.name}</p>
                              <p className="text-xs text-zinc-600">{team.abbreviation}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center font-black text-white">{recordLabel(team)}</td>
                        <td className="px-3 py-4 text-center text-sm text-zinc-300">{percentage(team.winPct)}</td>
                        <td className="px-3 py-4 text-center text-sm text-zinc-400">{gamesBehind(team.gamesBehind)}</td>
                        <td className="px-3 py-4 text-center text-sm text-zinc-400">{team.pointsFor}</td>
                        <td className="px-3 py-4 text-center text-sm text-zinc-400">{team.pointsAgainst}</td>
                        <td className={`px-3 py-4 text-center text-sm font-bold ${team.pointDifferential > 0 ? "text-emerald-300" : team.pointDifferential < 0 ? "text-red-300" : "text-zinc-500"}`}>
                          {team.pointDifferential > 0 ? "+" : ""}{team.pointDifferential}
                        </td>
                        <td className="px-5 py-4 text-center text-sm font-black text-zinc-300 sm:px-6">{team.streak}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>
      </main>
    </AppLayout>
  );
}
