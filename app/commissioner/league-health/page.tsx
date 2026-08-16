"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AppLayout from "@/app/components/layout/AppLayout";

type HealthStatus =
  | "active_user"
  | "monitor"
  | "hot_seat"
  | "replacement_risk";

type TeamHealth = {
  team: {
    id: string;
    slug: string;
    city: string | null;
    name: string;
    abbreviation: string;
  };

  owner: {
    id: string;
    discordId: string | null;
    username: string | null;
    displayName: string;
  } | null;

  gameplay: {
    eligible: number;
    played: number;
    forceSims: number;
    unknownFinals: number;
    playRate: number;
    gameplayScore: number;
    recentPlayed: number;
    recentForceSims: number;

    recent: {
      week: number;
      type:
        | "played"
        | "force_sim"
        | "unknown_final"
        | "not_completed";
      opponent: string | null;
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
  status: HealthStatus;
  attention: string[];
};

type Report = {
  revision: string;

  generatedAt: string;

  league: {
    id: string;
    name: string;
    season: number;
    currentWeek: number;
  };

  overall: {
    score: number;
    status: HealthStatus;
    teamsTracked: number;
    attentionCount: number;
    activeUsers: number;
    monitors: number;
    hotSeat: number;
    replacementRisk: number;
  };

  metrics: {
    games: {
      actual: number;
      forceSims: number;
      currentWeek: number;
    };

    discord: {
      available: boolean;
      linkedTeams: number;
      activeTeams: number;
    };
  };

  dataSources: {
    games: {
      ready: boolean;
      label: string;
    };

    discord: {
      ready: boolean;
      label: string;
      lastCompletedAt: string | null;
      lastError: string | null;
      channelsScanned: number;
    };
  };

  shouldSync: boolean;

  teams: TeamHealth[];
};

function statusLabel(
  status: HealthStatus,
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

function statusClasses(
  status: HealthStatus,
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
    return "border-orange-400/35 bg-orange-400/10 text-orange-100";
  }

  return "border-red-500/40 bg-red-500/15 text-red-100";
}

function resultLabel(
  value:
    TeamHealth["gameplay"]["recent"][number]["type"],
) {
  if (
    value ===
    "played"
  ) {
    return "PLAYED";
  }

  if (
    value ===
    "force_sim"
  ) {
    return "FORCE/SIM";
  }

  if (
    value ===
    "unknown_final"
  ) {
    return "UNKNOWN";
  }

  return "NOT PLAYED";
}

function resultClasses(
  value:
    TeamHealth["gameplay"]["recent"][number]["type"],
) {
  if (
    value ===
    "played"
  ) {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (
    value ===
    "force_sim"
  ) {
    return "border-red-400/25 bg-red-400/10 text-red-200";
  }

  return "border-zinc-600/40 bg-zinc-900 text-zinc-400";
}

function relativeTime(
  value: string | null,
) {
  if (!value) {
    return "No recent messages";
  }

  const difference =
    Date.now() -
    new Date(
      value,
    ).getTime();

  const hours =
    Math.floor(
      difference /
      3_600_000,
    );

  if (
    hours < 1
  ) {
    return "Less than 1h ago";
  }

  if (
    hours < 24
  ) {
    return `${hours}h ago`;
  }

  return `${Math.floor(
    hours / 24,
  )}d ago`;
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
    search,
    setSearch,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<
      | "all"
      | "active_user"
      | "monitor"
      | "hot_seat"
      | "replacement_risk"
    >("all");

  const loadReport =
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
                "Unable to load League Health.",
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
              : "Unable to load League Health.",
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

        await loadReport();
      } catch (
        syncError
      ) {
        setError(
          syncError instanceof
            Error
            ? syncError.message
            : "Discord sync failed.",
        );
      } finally {
        setSyncing(
          false,
        );
      }
    };

  useEffect(
    () => {
      void loadReport();

      const interval =
        window.setInterval(
          () => {
            void loadReport();
          },
          5 *
            60 *
            1000,
        );

      return () =>
        window.clearInterval(
          interval,
        );
    },
    [
      loadReport,
    ],
  );

  const teams =
    useMemo(
      () => {
        if (!report) {
          return [];
        }

        const query =
          search
            .trim()
            .toLowerCase();

        return report.teams.filter(
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
        search,
        filter,
      ],
    );

  return (
    <AppLayout>
      <main className="min-h-screen bg-[#050506] text-white">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.30),transparent_32rem),radial-gradient(circle_at_88%_0%,rgba(245,158,11,0.15),transparent_30rem)]">
          <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-purple-300">
                  Commissioner Command Center
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                  League Health
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
                  Replacement radar based only on Madden participation and Discord activity.
                  Discord linking itself never affects a team's score.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void syncDiscord()
                }
                disabled={
                  syncing
                }
                className="min-h-12 rounded-2xl bg-[linear-gradient(135deg,#6d28d9,#9333ea,#d97706)] px-6 text-sm font-black uppercase tracking-[0.12em] disabled:opacity-50"
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
            <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">
              {error}
            </div>
          ) : null}

          {loading ||
          !report ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center text-zinc-500">
              Building League Health...
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Active Users
                  </p>

                  <p className="mt-3 text-4xl font-black text-emerald-300">
                    {report.overall.activeUsers}
                  </p>

                  <p className="mt-2 text-xs text-zinc-500">
                    80–100 health
                  </p>
                </article>

                <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Monitor
                  </p>

                  <p className="mt-3 text-4xl font-black text-yellow-200">
                    {report.overall.monitors}
                  </p>

                  <p className="mt-2 text-xs text-zinc-500">
                    65–79 health
                  </p>
                </article>

                <article className="rounded-3xl border border-orange-400/20 bg-orange-400/[0.06] p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                    Hot Seat
                  </p>

                  <p className="mt-3 text-4xl font-black text-orange-200">
                    {report.overall.hotSeat}
                  </p>

                  <p className="mt-2 text-xs text-zinc-500">
                    45–64 health
                  </p>
                </article>

                <article className="rounded-3xl border border-red-500/25 bg-red-500/[0.07] p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
                    Replacement Risk
                  </p>

                  <p className="mt-3 text-4xl font-black text-red-200">
                    {report.overall.replacementRisk}
                  </p>

                  <p className="mt-2 text-xs text-zinc-500">
                    0–44 health
                  </p>
                </article>
              </section>

              <section className="mt-4 grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-zinc-600">
                    Actual Games
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {report.metrics.games.actual}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    User-played Madden games
                  </p>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-zinc-600">
                    Force / Sim Results
                  </p>

                  <p className="mt-2 text-2xl font-black text-orange-200">
                    {report.metrics.games.forceSims}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    No actual-game credit
                  </p>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-zinc-600">
                    Discord Active
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {report.metrics.discord.activeTeams}/{report.metrics.discord.linkedTeams}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Linked teams with messages in last 7d
                  </p>
                </article>
              </section>

              <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
                <div className="border-b border-white/10 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">
                        Replacement Radar
                      </p>

                      <h2 className="mt-2 text-3xl font-black">
                        Team Activity
                      </h2>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row">
                      <input
                        value={search}
                        onChange={(event) =>
                          setSearch(
                            event.target.value,
                          )
                        }
                        placeholder="Search team or owner"
                        className="min-h-11 rounded-xl border border-white/10 bg-black/40 px-4 text-sm outline-none"
                      />

                      <select
                        value={filter}
                        onChange={(event) =>
                          setFilter(
                            event.target.value as typeof filter,
                          )
                        }
                        className="min-h-11 rounded-xl border border-white/10 bg-black px-4 text-sm font-bold"
                      >
                        <option value="all">
                          All
                        </option>

                        <option value="active_user">
                          Active Users
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
                </div>

                <div className="divide-y divide-white/[0.07]">
                  {teams.map(
                    (team) => (
                      <article
                        key={
                          team.team.id
                        }
                        className="grid gap-5 px-5 py-6 lg:grid-cols-[1.25fr_1.15fr_1fr_1.15fr_0.9fr] lg:items-center lg:px-6"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-sm font-black">
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
                            In-Game Activity
                          </p>

                          <p className="mt-2 text-xl font-black">
                            {team.gameplay.played}/{team.gameplay.eligible}
                            <span className="ml-1 text-xs font-bold text-zinc-500">
                              played
                            </span>
                          </p>

                          <p className={`mt-1 text-xs font-bold ${
                            team.gameplay.forceSims > 0
                              ? "text-orange-300"
                              : "text-zinc-500"
                          }`}>
                            {team.gameplay.forceSims} force/sim result
                            {team.gameplay.forceSims === 1
                              ? ""
                              : "s"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                            Discord
                          </p>

                          {team.discord.linked ? (
                            <>
                              <p className="mt-2 text-lg font-black">
                                {team.discord.messages7d} msgs / 7d
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                {team.discord.messages30d} / 30d •{" "}
                                {relativeTime(
                                  team.discord.lastMessageAt,
                                )}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="mt-2 text-sm font-black text-zinc-500">
                                Not linked
                              </p>

                              <p className="mt-1 text-xs text-zinc-600">
                                Ignored in score
                              </p>
                            </>
                          )}
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                            Recent Madden
                          </p>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {team.gameplay.recent.length ? (
                              team.gameplay.recent.map(
                                (result) => (
                                  <span
                                    key={`${team.team.id}-${result.week}`}
                                    className={`rounded-lg border px-2 py-1 text-[9px] font-black ${resultClasses(
                                      result.type,
                                    )}`}
                                  >
                                    W{result.week}{" "}
                                    {resultLabel(
                                      result.type,
                                    )}
                                  </span>
                                ),
                              )
                            ) : (
                              <span className="text-xs text-zinc-600">
                                No eligible weeks
                              </span>
                            )}
                          </div>

                          {team.attention.length ? (
                            <p className="mt-2 text-xs font-bold text-orange-200">
                              {team.attention[0]}
                            </p>
                          ) : null}
                        </div>

                        <div className="lg:text-right">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] ${statusClasses(
                              team.status,
                            )}`}
                          >
                            {statusLabel(
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
                Score: 70% Madden activity + 30% Discord activity.
                If Discord is not linked, Madden activity becomes 100% of the score.
                Owner connection itself never adds or removes points.
              </p>
            </>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
