import Link from "next/link";
import AppLayout from "../components/layout/AppLayout";

const upcomingFeatures = [
  "Conference and division standings",
  "Live team records and winning streaks",
  "Playoff positioning",
  "Real league data once the season begins",
];

export default function StandingsPage() {
  return (
    <AppLayout>
      <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center px-4 py-12 sm:px-6">
        <section className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0d0e10] px-6 py-12 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-purple-600/10 blur-[110px]" />
            <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-blue-600/10 blur-[130px]" />
          </div>

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.65)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
                Under Construction
              </span>
            </div>

            <p className="mt-7 text-xs font-black uppercase tracking-[0.3em] text-purple-300">
              New Era CFM
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-6xl">
              League Standings
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
              Standings will automatically populate with real league results
              once the first NEW ERA season begins. No placeholder records. No
              fake stats.
            </p>

            <div className="mt-9 grid gap-3 text-left sm:grid-cols-2">
              {upcomingFeatures.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-purple-400/20 bg-purple-400/10 text-sm text-purple-200">
                    ✓
                  </div>
                  <p className="text-sm font-bold text-zinc-300">{feature}</p>
                </div>
              ))}
            </div>

            <div className="mt-9 rounded-2xl border border-white/10 bg-black/20 px-5 py-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                Current League Phase
              </p>
              <p className="mt-2 text-xl font-black text-white">
                Member Registration
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Team selection is scheduled for August 1–5.
              </p>
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/members"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-black text-white transition hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/20 active:scale-[0.98]"
              >
                View League Members
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-black text-white transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}