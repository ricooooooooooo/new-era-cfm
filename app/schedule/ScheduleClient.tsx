"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ScheduleTeam = {
  id: string | null;
  city: string | null;
  name: string;
  abbreviation: string;
};

type ScheduleGame = {
  id: string;
  season: number;
  week: number;
  gameType: string;
  scheduledAt: string | null;
  status: "scheduled" | "in_progress" | "final" | "cancelled";
  homeScore: number | null;
  awayScore: number | null;
  isPrimetime: boolean;
  broadcastLabel: string | null;
  source: string;
  homeTeam: ScheduleTeam;
  awayTeam: ScheduleTeam;
  marketCount: number;
  hasOpenMarkets: boolean;
};

type ScheduleResponse = {
  league: {
    id: string;
    name: string;
  } | null;
  season: number;
  currentWeek: number;
  selectedWeek: number;
  weeks: number[];
  games: ScheduleGame[];
  syncStatus: string;
  error?: string;
};

function teamLogo(abbreviation: string) {
  return `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${abbreviation}`;
}

function teamName(team: ScheduleTeam) {
  return [team.city, team.name].filter(Boolean).join(" ");
}

function kickoff(value: string | null) {
  if (!value) return "Kickoff TBD";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(game: ScheduleGame) {
  if (game.status === "final") return "Final";
  if (game.status === "in_progress") return "In Progress";
  if (game.status === "cancelled") return "Cancelled";
  return kickoff(game.scheduledAt);
}

export default function ScheduleClient() {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSchedule = useCallback(async (week?: number | null) => {
    setLoading(true);
    setError("");

    try {
      const query = week ? `?week=${week}` : "";
      const response = await fetch(`/api/schedule${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ScheduleResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load schedule.");
      }

      setData(payload);
      setSelectedWeek(payload.selectedWeek);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load schedule.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const counts = useMemo(() => {
    const games = data?.games ?? [];

    return {
      games: games.length,
      final: games.filter((game) => game.status === "final").length,
      upcoming: games.filter((game) => game.status === "scheduled").length,
      markets: games.reduce(
        (total, game) => total + game.marketCount,
        0,
      ),
    };
  }, [data]);

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[#050606] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(124,58,237,0.32),transparent_34rem),radial-gradient(circle_at_85%_18%,rgba(245,158,11,0.16),transparent_30rem)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">
            Gold Jacket Schedule Center
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] sm:text-7xl">
            Every Week. Every Result.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">
            This page is connected to the permanent game-data layer. Madden
            schedule imports will fill the matchups, scores and prediction
            markets automatically.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 sm:py-10">
        {error ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-sm font-bold text-red-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Week Games", counts.games],
            ["Final", counts.final],
            ["Upcoming", counts.upcoming],
            ["Markets", counts.markets],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">
                {label}
              </p>
              <p className="mt-3 text-3xl font-black">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                Season {data?.season ?? 1}
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Week {selectedWeek ?? data?.currentWeek ?? 1}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {(data?.weeks.length
                ? data.weeks
                : Array.from({ length: 18 }, (_, index) => index + 1)
              ).map((week) => (
                <button
                  key={week}
                  type="button"
                  onClick={() => void loadSchedule(week)}
                  disabled={loading}
                  className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-black transition ${
                    selectedWeek === week
                      ? "border-amber-400 bg-amber-500/20 text-amber-100"
                      : "border-white/10 bg-white/[0.04] text-zinc-500 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {week}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center text-zinc-500">
              Loading the schedule...
            </div>
          ) : !data || data.games.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-amber-400/20 bg-amber-400/[0.045] p-10 text-center">
              <p className="text-2xl font-black">
                Waiting for the first Madden schedule sync
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                The page is fully active. As soon as the EA adapter sends the
                first week, every matchup will appear here and game-winner
                markets will be created automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {data.games.map((game) => (
                <article
                  key={game.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f10]"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.07] bg-black/30 px-5 py-3">
                    <div className="flex items-center gap-2">
                      {game.isPrimetime ? (
                        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-amber-100">
                          Primetime
                        </span>
                      ) : null}
                      <span className="text-xs font-bold text-zinc-500">
                        {game.broadcastLabel || statusLabel(game)}
                      </span>
                    </div>

                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
                      {game.source === "ea_franchise"
                        ? "EA Franchise"
                        : game.source}
                    </span>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-5 sm:p-6">
                    {[game.awayTeam, game.homeTeam].map((team, index) => {
                      const score =
                        index === 0 ? game.awayScore : game.homeScore;

                      return (
                        <div
                          key={`${game.id}:${team.abbreviation}`}
                          className={`flex min-w-0 flex-col items-center text-center ${
                            index === 1 ? "order-3" : ""
                          }`}
                        >
                          <div className="relative h-20 w-20">
                            <Image
                              src={teamLogo(team.abbreviation)}
                              alt={teamName(team)}
                              fill
                              unoptimized
                              className="object-contain"
                            />
                          </div>
                          <p className="mt-3 truncate text-lg font-black">
                            {team.name}
                          </p>
                          <p className="mt-1 text-xs text-zinc-600">
                            {team.abbreviation}
                          </p>
                          {game.status === "final" ||
                          game.status === "in_progress" ? (
                            <p className="mt-3 text-4xl font-black">
                              {score ?? 0}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}

                    <div className="order-2 text-center">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
                        {game.status === "final"
                          ? "Final"
                          : game.status === "in_progress"
                            ? "Live"
                            : "At"}
                      </p>
                      <p className="mt-2 text-xl font-black text-zinc-300">
                        {game.status === "scheduled"
                          ? "@"
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-zinc-500">
                      {statusLabel(game)}
                    </p>

                    {game.hasOpenMarkets ? (
                      <Link
                        href={`/predictions?week=${game.week}`}
                        className="rounded-xl bg-amber-600 px-4 py-2.5 text-center text-xs font-black uppercase tracking-[0.12em] hover:bg-amber-500"
                      >
                        Bet This Game →
                      </Link>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">
                        {game.marketCount > 0
                          ? "Market Closed"
                          : "Market Pending"}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
