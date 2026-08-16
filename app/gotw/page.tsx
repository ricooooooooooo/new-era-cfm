import Image from "next/image";
import Link from "next/link";

import AppLayout from "@/app/components/layout/AppLayout";
import {
  loadSiteWeeklyHighlights,
} from "@/lib/site-weekly-highlights";

export const dynamic =
  "force-dynamic";

export default async function GotwPage() {
  const data =
    await loadSiteWeeklyHighlights();

  const gotw =
    data.gotw;

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#050506] px-4 py-6 text-white sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">
                New Era Featured Matchup
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                Game of the Week
              </h1>
            </div>

            <Link
              href="/home"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-400"
            >
              ← Home
            </Link>
          </div>

          {!gotw ? (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center sm:p-12">
              <p className="text-3xl">
                🏈
              </p>

              <h2 className="mt-4 text-2xl font-black">
                Week {data.currentWeek} GOTW is loading.
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Autopilot hasn&apos;t published the matchup yet.
              </p>
            </section>
          ) : (
            <>
              <section className="relative mt-8 overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[radial-gradient(circle_at_15%_50%,rgba(126,34,206,.25),transparent_38%),radial-gradient(circle_at_85%_50%,rgba(245,158,11,.16),transparent_38%),#09090c] p-6 sm:p-10">
                <div className="text-center">
                  <span className="inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                    Season {data.season} • Week {gotw.week}
                  </span>
                </div>

                <div className="mt-8 grid items-center gap-7 sm:grid-cols-[1fr_auto_1fr]">
                  <div className="text-center">
                    <div className="relative mx-auto h-32 w-32 sm:h-44 sm:w-44">
                      <Image
                        src={`https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${gotw.away.abbreviation}`}
                        alt={gotw.away.name}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>

                    <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                      {gotw.away.city}
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      {gotw.away.name}
                    </h2>

                    <p className="mt-1 text-lg font-black text-purple-300">
                      {gotw.away.record}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                      Matchup
                    </p>

                    <p className="mt-1 text-5xl font-black italic">
                      @
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="relative mx-auto h-32 w-32 sm:h-44 sm:w-44">
                      <Image
                        src={`https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${gotw.home.abbreviation}`}
                        alt={gotw.home.name}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>

                    <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                      {gotw.home.city}
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      {gotw.home.name}
                    </h2>

                    <p className="mt-1 text-lg font-black text-amber-300">
                      {gotw.home.record}
                    </p>
                  </div>
                </div>

                <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-white/10 bg-black/30 p-5 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
                    Why this game?
                  </p>

                  <p className="mt-2 text-lg font-black">
                    {gotw.reason}
                  </p>
                </div>
              </section>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/predictions"
                  className="flex min-h-14 items-center justify-center rounded-2xl bg-purple-600 px-5 text-sm font-black uppercase tracking-[0.1em] transition hover:bg-purple-500"
                >
                  Bet on GOTW
                </Link>

                <Link
                  href="/schedule"
                  className="flex min-h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black uppercase tracking-[0.1em]"
                >
                  View Week {gotw.week}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
