import Link from "next/link";
import AppLayout from "../components/layout/AppLayout";

const divisions = [
  {
    conference: "AFC",
    division: "East",
    teams: ["Bills","Jets","Patriots","Dolphins"],
  },
  {
    conference: "AFC",
    division: "North",
    teams: ["Ravens","Bengals","Browns","Steelers"],
  },
  {
    conference: "NFC",
    division: "East",
    teams: ["Eagles","Cowboys","Commanders","Giants"],
  },
  {
    conference: "NFC",
    division: "West",
    teams: ["49ers","Rams","Seahawks","Cardinals"],
  },
];

export default function StandingsPage() {
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <header className="rounded-[28px] border border-white/10 bg-[#0d0f12] p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
            Season One
          </p>

          <h1 className="mt-2 text-5xl font-black tracking-[-0.05em] text-white">
            League Standings
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Standings will populate automatically when NEW ERA begins. The layout
            below is the live design that will display league records, playoff
            races and division leaders.
          </p>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {divisions.map((division) => (
            <article
              key={division.conference + division.division}
              className="rounded-[26px] border border-white/10 bg-[#0d0f12] overflow-hidden"
            >
              <div className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] font-black text-zinc-600">
                    {division.conference}
                  </p>
                  <h2 className="text-2xl font-black text-white">
                    {division.division}
                  </h2>
                </div>

                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
                  Waiting For Season
                </span>
              </div>

              <div>
                {division.teams.map((team) => (
                  <div
                    key={team}
                    className="flex items-center justify-between border-t border-white/5 px-6 py-4 hover:bg-white/[0.03] transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-xs font-black text-zinc-300">
                        {team.slice(0,2).toUpperCase()}
                      </div>

                      <div>
                        <p className="font-black text-white">{team}</p>
                        <p className="text-xs text-zinc-500">
                          Record pending
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-white">--</p>
                      <p className="text-xs text-zinc-600">GB</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <div className="mt-8 flex gap-3">
          <Link
            href="/"
            className="rounded-xl bg-white px-5 py-3 text-sm font-black text-black hover:bg-zinc-200"
          >
            Dashboard
          </Link>

          <Link
            href="/members"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white hover:bg-white/[0.07]"
          >
            Members
          </Link>
        </div>
      </main>
    </AppLayout>
  );
}