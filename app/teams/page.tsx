import Link from "next/link";
import AppLayout from "../components/layout/AppLayout";
import { teams } from "../data/teams";

export default function TeamsPage() {
  const claimedTeams = teams.filter((team) => team.owner !== "Open").length;
  const openTeams = teams.filter((team) => team.owner === "Open").length;

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-red-500">
              New Era CFM
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-tight">
              League Teams
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              View every franchise, owner, record, conference, division, and
              team headquarters.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black transition hover:bg-red-500">
              All Teams
            </button>

            <button className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-bold text-zinc-400 transition hover:text-white">
              Open Teams
            </button>
          </div>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Total Teams
            </p>
            <p className="mt-2 text-4xl font-black">{teams.length}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Claimed
            </p>
            <p className="mt-2 text-4xl font-black">{claimedTeams}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Open Teams
            </p>
            <p className="mt-2 text-4xl font-black text-red-500">
              {openTeams}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Current Week
            </p>
            <p className="mt-2 text-4xl font-black">8</p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <article
              key={team.slug}
              className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 transition duration-300 hover:-translate-y-1 hover:border-zinc-700"
            >
              <div
                className="border-b border-zinc-800 p-6"
                style={{
                  background: `linear-gradient(135deg, ${team.primaryColor}55, #09090b 72%)`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl border text-xl font-black text-white shadow-xl"
                    style={{
                      borderColor: team.secondaryColor,
                      backgroundColor: team.primaryColor,
                    }}
                  >
                    {team.short}
                  </div>

                  <span
                    className={`rounded-lg px-3 py-2 text-xs font-black ${
                      team.owner === "Open"
                        ? "bg-red-950/90 text-red-400"
                        : "bg-emerald-950/90 text-emerald-400"
                    }`}
                  >
                    {team.owner === "Open" ? "OPEN TEAM" : "CLAIMED"}
                  </span>
                </div>

                <p className="mt-5 text-sm font-bold text-zinc-400">
                  {team.city}
                </p>

                <h2 className="text-3xl font-black">{team.name}</h2>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
                      Record
                    </p>
                    <p className="mt-2 text-2xl font-black">{team.record}</p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
                      Owner
                    </p>
                    <p className="mt-2 truncate text-lg font-black">
                      {team.owner}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="text-sm font-bold">{team.division}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {team.conference} Conference
                  </p>
                </div>

                <Link
                  href={`/teams/${team.slug}`}
                  className="mt-5 block w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-black text-zinc-300 transition group-hover:border-red-600 group-hover:bg-red-600 group-hover:text-white"
                >
                  View Franchise
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </AppLayout>
  );
}