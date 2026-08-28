import Image from "next/image";
import Link from "next/link";

import AppLayout from "@/app/components/layout/AppLayout";
import {
  loadSiteWeeklyHighlights,
} from "@/lib/site-weekly-highlights";

export const dynamic =
  "force-dynamic";

export default async function PotwPage() {
  const data =
    await loadSiteWeeklyHighlights();

  const potw =
    data.potw;

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#050506] px-4 py-6 text-white sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">
                Gold Jacket Awards
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                Players of the Week
              </h1>
            </div>

            <Link
              href="/home"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-400"
            >
              ← Home
            </Link>
          </div>

          {!potw ? (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center sm:p-12">
              <p className="text-3xl">
                🏆
              </p>

              <h2 className="mt-4 text-2xl font-black">
                POTW is loading.
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                The latest awards haven&apos;t been published by Autopilot yet.
              </p>
            </section>
          ) : (
            <>
              <div className="mt-7 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-zinc-500">
                    Season {data.season}
                  </p>

                  <p className="text-xl font-black">
                    Week {potw.week}
                  </p>
                </div>

                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                  +2 NP Reward
                </span>
              </div>

              <section className="mt-4 grid gap-4 md:grid-cols-2">
                {potw.awards.map(
                  (
                    award,
                  ) => (
                    <article
                      key={award.label}
                      className={`relative overflow-hidden rounded-[1.75rem] border p-6 ${
                        award.defensive
                          ? "border-blue-400/20 bg-[linear-gradient(145deg,rgba(37,99,235,.13),#090a0c)]"
                          : "border-purple-400/20 bg-[linear-gradient(145deg,rgba(126,34,206,.14),#090a0c)]"
                      }`}
                    >
                      <div className="flex items-start gap-5">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                          <Image
                            src={`/api/media/potw-headshot?name=${encodeURIComponent(
                              award.playerName,
                            )}${
                              award.team
                                ? `&team=${award.team}`
                                : ""
                            }`}
                            alt={award.playerName}
                            fill
                            unoptimized
                            className="object-cover object-top"
                          />
                        </div>

                        <div className="min-w-0">
                          <p
                            className={`text-[9px] font-black uppercase tracking-[0.17em] ${
                              award.defensive
                                ? "text-blue-300"
                                : "text-purple-300"
                            }`}
                          >
                            {award.label}
                          </p>

                          <h2 className="mt-2 text-2xl font-black">
                            {award.playerName}
                          </h2>

                          {award.team ? (
                            <p className="mt-1 text-sm font-black text-zinc-500">
                              {award.team}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                          Week {potw.week} Stats
                        </p>

                        <p className="mt-2 text-sm font-bold leading-6 text-zinc-200">
                          {award.statLine ||
                            "Award-winning performance"}
                        </p>
                      </div>

                      <p className="mt-4 text-xs font-black text-amber-300">
                        🎁 Winning owner earns +2 NP
                      </p>
                    </article>
                  ),
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
