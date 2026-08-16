"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AppLayout from "@/app/components/layout/AppLayout";

type Status =
  | "active_user"
  | "monitor"
  | "hot_seat"
  | "replacement_risk";

type TeamHealth = {
  team: {
    id: string;
    city: string | null;
    name: string;
    abbreviation: string;
  };

  owner: {
    displayName: string;
    username: string | null;
    discordId: string | null;
  } | null;

  madden: {
    elapsedWeeks: number;
    played: number;
    adminWins: number;
    forcedLosses: number;
    missed: number;
    neutralSims: number;
    unknown: number;
    accountableGames: number;
    participationRate: number;
    score: number;

    recent: {
      week: number;
      opponent: string | null;
      result: string;
    }[];
  };

  discord: {
    linked: boolean;
    available: boolean;
    messages7d: number;
    messages30d: number;
    lastMessageAt: string | null;
    score: number | null;
  };

  score: number;
  status: Status;
  attention: string[];
};

type Report = {
  revision: string;

  calibration: {
    playedStatus: number;
    simStatus: number;
    anchor: string;
  };

  league: {
    name: string;
    season: number;
    currentWeek: number;
  };

  overall: {
    score: number;
    status: Status;
    activeUsers: number;
    monitor: number;
    hotSeat: number;
    replacementRisk: number;
  };

  dataSources: {
    games: {
      ready: boolean;
      label: string;
    };

    discord: {
      ready: boolean;
      label: string;
      lastError: string | null;
    };
  };

  shouldSync: boolean;

  teams: TeamHealth[];
};

function label(
  status: Status,
) {
  if (
    status ===
    "active_user"
  ) {
    return "ACTIVE USER";
  }

  if (
    status ===
    "monitor"
  ) {
    return "MONITOR";
  }

  if (
    status ===
    "hot_seat"
  ) {
    return "HOT SEAT";
  }

  return "REPLACEMENT RISK";
}

function classes(
  status: Status,
) {
  if (
    status ===
    "active_user"
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (
    status ===
    "monitor"
  ) {
    return "border-yellow-400/30 bg-yellow-400/10 text-yellow-100";
  }

  if (
    status ===
    "hot_seat"
  ) {
    return "border-orange-400/30 bg-orange-400/10 text-orange-100";
  }

  return "border-red-500/35 bg-red-500/15 text-red-100";
}

function recentClass(
  result: string,
) {
  if (
    result ===
    "played"
  ) {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (
    result ===
    "admin_win"
  ) {
    return "border-blue-400/20 bg-blue-400/10 text-blue-200";
  }

  if (
    result ===
      "forced_loss" ||
    result ===
      "missed"
  ) {
    return "border-red-400/20 bg-red-400/10 text-red-200";
  }

  return "border-zinc-600/30 bg-zinc-900 text-zinc-400";
}

function recentLabel(
  result: string,
) {
  if (
    result ===
    "played"
  ) {
    return "PLAYED";
  }

  if (
    result ===
    "admin_win"
  ) {
    return "FW RECEIVED";
  }

  if (
    result ===
    "forced_loss"
  ) {
    return "FORCED LOSS";
  }

  if (
    result ===
    "missed"
  ) {
    return "MISSED";
  }

  if (
    result ===
    "neutral_sim"
  ) {
    return "SIM";
  }

  return "UNKNOWN";
}

export default function LeagueHealthPage() {
  const [
    report,
    setReport,
  ] =
    useState<Report | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    syncing,
    setSyncing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<
      "all" |
      Status
    >("all");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const load =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/commissioner/league-health",
              {
                cache:
                  "no-store",
              },
            );

          const payload =
            await response.json();

          if (
            !response.ok ||
            !payload.success
          ) {
            throw new Error(
              payload.error ??
                "League Health failed.",
            );
          }

          setReport(
            payload.report,
          );

          setError("");
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : String(loadError),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  const syncDiscord =
    async () => {
      try {
        setSyncing(
          true,
        );

        const response =
          await fetch(
            "/api/commissioner/league-health/sync",
            {
              method:
                "POST",
            },
          );

        const payload =
          await response.json();

        if (
          !response.ok ||
          !payload.success
        ) {
          throw new Error(
            payload.error ??
              "Discord sync failed.",
          );
        }

        await load();
      } catch (
        syncError
      ) {
        setError(
          syncError instanceof
            Error
            ? syncError.message
            : String(syncError),
        );
      } finally {
        setSyncing(
          false,
        );
      }
    };

  useEffect(
    () => {
      void load();

      const timer =
        window.setInterval(
          () => {
            void load();
          },
          5 *
            60 *
            1000,
        );

      return () =>
        clearInterval(
          timer,
        );
    },
    [
      load,
    ],
  );

  const teams =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return (
          report?.teams ??
          []
        ).filter(
          (team) => {
            if (
              filter !==
                "all" &&
              team.status !==
                filter
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              team.team.city,
              team.team.name,
              team.team.abbreviation,
              team.owner
                ?.displayName,
              team.owner
                ?.username,
            ]
              .filter(
                Boolean,
              )
              .some(
                (value) =>
                  String(
                    value,
                  )
                    .toLowerCase()
                    .includes(
                      query,
                    ),
              );
          },
        );
      },
      [
        report,
        filter,
        search,
      ],
    );

  return (
    <AppLayout>
      <main className="min-h-screen bg-[#050506] text-white">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.28),transparent_34rem),radial-gradient(circle_at_90%_0%,rgba(245,158,11,0.14),transparent_30rem)]">
          <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-300">
                  Commissioner Command Center
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                  League Health
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                  80% Madden participation • 20% Discord activity.
                  Receiving a force win never hurts your score.
                  Discord linking itself is worth zero points.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  syncDiscord
                }
                disabled={
                  syncing
                }
                className="min-h-12 rounded-2xl bg-[linear-gradient(135deg,#6d28d9,#9333ea,#d97706)] px-6 text-sm font-black uppercase tracking-[0.1em] disabled:opacity-50"
              >
                {syncing
                  ? "Syncing..."
                  : "Sync Discord"}
              </button>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          {error ? (
            <div className="mb-5 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-red-100">
              {error}
            </div>
          ) : null}

          {loading ||
          !report ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center text-zinc-500">
              Calculating real league activity...
            </div>
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    title:
                      "Active Users",
                    value:
                      report.overall.activeUsers,
                    status:
                      "active_user" as Status,
                  },
                  {
                    title:
                      "Monitor",
                    value:
                      report.overall.monitor,
                    status:
                      "monitor" as Status,
                  },
                  {
                    title:
                      "Hot Seat",
                    value:
                      report.overall.hotSeat,
                    status:
                      "hot_seat" as Status,
                  },
                  {
                    title:
                      "Replacement Risk",
                    value:
                      report.overall.replacementRisk,
                    status:
                      "replacement_risk" as Status,
                  },
                ].map(
                  (card) => (
                    <article
                      key={
                        card.title
                      }
                      className={`rounded-3xl border p-6 ${classes(
                        card.status,
                      )}`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                        {card.title}
                      </p>

                      <p className="mt-3 text-4xl font-black">
                        {card.value}
                      </p>
                    </article>
                  ),
                )}
              </section>

              <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025]">
                <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-black">
                      Replacement Radar
                    </h2>

                    <p className="mt-1 text-xs text-zinc-500">
                      EA played status: {report.calibration.playedStatus}
                      {" • "}
                      sim/force status: {report.calibration.simStatus}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={
                        search
                      }
                      onChange={
                        (
                          event,
                        ) =>
                          setSearch(
                            event
                              .target
                              .value,
                          )
                      }
                      placeholder="Search team or owner"
                      className="min-h-11 rounded-xl border border-white/10 bg-black/40 px-4 text-sm"
                    />

                    <select
                      value={
                        filter
                      }
                      onChange={
                        (
                          event,
                        ) =>
                          setFilter(
                            event
                              .target
                              .value as
                              | "all"
                              | Status,
                          )
                      }
                      className="min-h-11 rounded-xl border border-white/10 bg-black px-4 text-sm font-bold"
                    >
                      <option value="all">
                        All Teams
                      </option>

                      <option value="active_user">
                        Active User
                      </option>

                      <option value="monitor">
                        Monitor
                      </option>

                      <option value="hot_seat">
                        Hot Seat
                      </option>

                      <option value="replacement_risk">
                        Replacement Risk
                      </option>
                    </select>
                  </div>
                </div>

                <div className="divide-y divide-white/[0.07]">
                  {teams.map(
                    (team) => (
                      <article
                        key={
                          team.team.id
                        }
                        className="grid gap-5 p-5 lg:grid-cols-[1.15fr_1.15fr_0.85fr_1.35fr_0.75fr] lg:items-center lg:px-6"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 font-black">
                              {team.team.abbreviation}
                            </div>

                            <div>
                              <p className="font-black">
                                {team.team.city}{" "}
                                {team.team.name}
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                {team.owner?.displayName ??
                                  "Discord not linked"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                            Madden Activity
                          </p>

                          <p className="mt-2 text-xl font-black">
                            {team.madden.played}/{team.madden.elapsedWeeks}
                            <span className="ml-1 text-xs text-zinc-500">
                              actual games
                            </span>
                          </p>

                          <p className="mt-1 text-xs text-blue-300">
                            {team.madden.adminWins} FW received
                            {" • "}
                            {team.madden.forcedLosses + team.madden.missed} bad/missed
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                            Discord
                          </p>

                          {team.discord.linked ? (
                            <>
                              <p className="mt-2 font-black">
                                {team.discord.messages7d} msgs / 7d
                              </p>

                              <p className="mt-1 text-xs text-zinc-600">
                                {team.discord.messages30d} / 30d
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="mt-2 font-black text-zinc-500">
                                Not linked
                              </p>

                              <p className="mt-1 text-xs text-zinc-600">
                                No penalty
                              </p>
                            </>
                          )}
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                            Recent
                          </p>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {team.madden.recent.length ? (
                              team.madden.recent.map(
                                (
                                  item,
                                ) => (
                                  <span
                                    key={`${team.team.id}-${item.week}`}
                                    className={`rounded-lg border px-2 py-1 text-[9px] font-black ${recentClass(
                                      item.result,
                                    )}`}
                                  >
                                    W{item.week}{" "}
                                    {recentLabel(
                                      item.result,
                                    )}
                                  </span>
                                ),
                              )
                            ) : (
                              <span className="text-xs text-zinc-600">
                                No history
                              </span>
                            )}
                          </div>

                          {team.attention[0] ? (
                            <p className="mt-2 text-xs font-bold text-orange-200">
                              {team.attention[0]}
                            </p>
                          ) : null}
                        </div>

                        <div className="lg:text-right">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-[9px] font-black uppercase ${classes(
                              team.status,
                            )}`}
                          >
                            {label(
                              team.status,
                            )}
                          </span>

                          <p className="mt-2 text-3xl font-black">
                            {team.score}
                          </p>

                          <p className="text-[10px] text-zinc-600">
                            /100
                          </p>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </section>

              <p className="mt-5 text-xs leading-6 text-zinc-600">
                Active User: 80–100 • Monitor: 65–79 • Hot Seat:
                45–64 • Replacement Risk: 0–44.
              </p>
            </>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
