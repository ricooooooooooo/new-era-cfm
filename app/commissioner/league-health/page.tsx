"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AppLayout from "@/app/components/layout/AppLayout";

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
    websiteActive: boolean;
    lastWebsiteSeenAt: string | null;
  } | null;
  game: {
    id: string;
    status: string;
    scheduledAt: string | null;
    homeScore: number | null;
    awayScore: number | null;
    opponentAbbreviation: string | null;
    overdue: boolean;
  } | null;
  games: {
    eligible: number;
    realPlayed: number;
    fairSims: number;
    unknownFinals: number;
    unplayed: number;
    recentReal: number;
  };
  discord: {
    available: boolean;
    messages7d: number;
    messages30d: number;
    lastMessageAt: string | null;
  };
  activeChecks: {
    available: boolean;
    total: number;
    hits: number;
    misses: number;
    consecutiveMisses: number;
    latest: "hit" | "missed" | "no_data";
  };
  score: number;
  status:
    | "active_user"
    | "monitor"
    | "hot_seat"
    | "replacement_risk";
  attention: string[];
};

type LeagueHealthReport = {
  generatedAt: string;
  league: {
    id: string;
    name: string;
    season: number;
    currentWeek: number;
  };
  overall: {
    score: number;
    status:
      | "active_user"
      | "monitor"
      | "hot_seat"
      | "replacement_risk";
    teamsTracked: number;
    attentionCount: number;
  };
  metrics: {
    owners: {
      assigned: number;
      total: number;
    };
    games: {
      available: boolean;
      completed: number;
      total: number;
      pending: number;
      realPlayed: number;
      fairSims: number;
    };
    discord: {
      available: boolean;
      activeOwners: number;
      assignedOwners: number;
    };
    activeChecks: {
      available: boolean;
      latestCheckId: string | null;
      latestTitle: string | null;
      latestStartedAt: string | null;
      hits: number;
      eligibleOwners: number;
      checksTracked: number;
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
    activeChecks: {
      ready: boolean;
      label: string;
    };
  };
  shouldSync: boolean;
  teams: TeamHealth[];
};

type ReportResponse = {
  success: boolean;
  report?: LeagueHealthReport;
  error?: string;
};

function dateLabel(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function relativeTime(value: string | null) {
  if (!value) return "No activity captured";

  const milliseconds = Date.now() - new Date(value).getTime();
  const minutes = Math.max(
    0,
    Math.floor(milliseconds / (60 * 1_000)),
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function statusClasses(status: TeamHealth["status"]) {
  if (status === "active_user") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "monitor") {
    return "border-yellow-400/25 bg-yellow-400/10 text-yellow-200";
  }

  if (status === "hot_seat") {
    return "border-orange-400/30 bg-orange-400/10 text-orange-200";
  }

  return "border-red-500/35 bg-red-500/15 text-red-100";
}

function statusLabel(status: TeamHealth["status"]) {
  if (status === "active_user") return "ACTIVE USER";
  if (status === "monitor") return "MONITOR";
  if (status === "hot_seat") return "HOT SEAT";
  return "REPLACEMENT RISK";
}

function sourceClasses(ready: boolean) {
  return ready
    ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200"
    : "border-amber-400/20 bg-amber-400/[0.07] text-amber-200";
}

function gameLabel(team: TeamHealth) {
  if (team.games.eligible === 0) {
    return "No eligible games";
  }

  return `${team.games.realPlayed}/${team.games.eligible} played`;
}

export default function LeagueHealthPage() {
  const [report, setReport] =
    useState<LeagueHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<
    "all" | "attention" | "healthy"
  >("all");
  const [search, setSearch] = useState("");
  const autoSyncAttempted = useRef(false);

  const loadReport = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/commissioner/league-health",
        {
          cache: "no-store",
        },
      );

      const payload = (await response.json()) as ReportResponse;

      if (!response.ok || !payload.success || !payload.report) {
        throw new Error(
          payload.error ?? "Unable to load league health.",
        );
      }

      setReport(payload.report);
      return payload.report;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load league health.",
      );

      return null;
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  const syncDiscord = useCallback(
    async (automatic = false) => {
      if (syncing) return;

      setSyncing(true);

      if (!automatic) {
        setMessage("");
        setError("");
      }

      try {
        const response = await fetch(
          "/api/commissioner/league-health/sync",
          {
            method: "POST",
          },
        );

        const payload = (await response.json()) as {
          success: boolean;
          result?: {
            skipped?: boolean;
            channelsScanned?: number;
            messagesSaved?: number;
          };
          error?: string;
        };

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.error ?? "Discord activity sync failed.",
          );
        }

        if (!automatic) {
          setMessage(
            payload.result?.skipped
              ? "A Discord sync was already running."
              : `Discord activity updated from ${
                  payload.result?.channelsScanned ?? 0
                } channels.`,
          );
        }

        await loadReport(true);
      } catch (syncError) {
        if (!automatic) {
          setError(
            syncError instanceof Error
              ? syncError.message
              : "Discord activity sync failed.",
          );
        }
      } finally {
        setSyncing(false);
      }
    },
    [loadReport, syncing],
  );

  useEffect(() => {
    void loadReport().then((loaded) => {
      if (
        loaded?.shouldSync &&
        !autoSyncAttempted.current
      ) {
        autoSyncAttempted.current = true;
        void syncDiscord(true);
      }
    });
  }, [loadReport, syncDiscord]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadReport(true);
    }, 5 * 60 * 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadReport]);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (report?.teams ?? []).filter((team) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "attention" &&
          team.attention.length > 0) ||
        (filter === "healthy" &&
          team.attention.length === 0);

      if (!matchesFilter) return false;

      if (!query) return true;

      return [
        team.team.city,
        team.team.name,
        team.team.abbreviation,
        team.owner?.displayName,
        team.owner?.username,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query),
        );
    });
  }, [filter, report?.teams, search]);

  return (
    <AppLayout>
      <main className="min-h-[calc(100vh-8rem)] bg-[#050606] text-white">
        <section className="relative overflow-hidden border-b border-white/10 bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_4%,rgba(124,58,237,0.34),transparent_32rem),radial-gradient(circle_at_90%_8%,rgba(245,158,11,0.16),transparent_28rem)]" />

          <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-purple-300">
                  Commissioner Command Center
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                  League Health
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
                  Owner replacement radar powered by actual games played,
                  active checks and Discord activity.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void syncDiscord(false)}
                disabled={syncing}
                className="min-h-12 rounded-2xl bg-[linear-gradient(135deg,#6d28d9,#9333ea,#d97706)] px-6 text-sm font-black uppercase tracking-[0.12em] transition active:scale-[0.985] disabled:opacity-50"
              >
                {syncing
                  ? "Syncing Discord..."
                  : "Sync Discord Now"}
              </button>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
          {message ? (
            <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-100">
              {error}
            </div>
          ) : null}

          {loading || !report ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center text-zinc-500">
              Building the live league-health report...
            </div>
          ) : (
            <>
              <section className="grid gap-4 lg:grid-cols-[1.25fr_2.75fr]">
                <article className="relative overflow-hidden rounded-3xl border border-purple-400/20 bg-[linear-gradient(145deg,rgba(124,58,237,0.20),rgba(255,255,255,0.025))] p-6 sm:p-8">
                  <div className="absolute right-[-2rem] top-[-4rem] text-[11rem] font-black text-white/[0.025]">
                    {report.overall.score}
                  </div>

                  <div className="relative">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-300">
                      Overall Health
                    </p>

                    <div className="mt-5 flex items-end gap-3">
                      <span className="text-7xl font-black tracking-[-0.08em]">
                        {report.overall.score}
                      </span>
                      <span className="pb-2 text-2xl font-black text-zinc-600">
                        /100
                      </span>
                    </div>

                    <span
                      className={`mt-5 inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${statusClasses(
                        report.overall.status,
                      )}`}
                    >
                      {statusLabel(report.overall.status)}
                    </span>

                    <p className="mt-5 text-sm leading-6 text-zinc-400">
                      {report.overall.attentionCount} of{" "}
                      {report.overall.teamsTracked} teams currently
                      need attention.
                    </p>
                  </div>
                </article>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      label: "Actual Games",
                      value: report.metrics.games.available
                        ? `${report.metrics.games.realPlayed}/${report.metrics.games.total}`
                        : "No data",
                      detail: report.metrics.games.available
                        ? `${report.metrics.games.fairSims} fair sims excluded`
                        : "Waiting for completed weeks",
                    },
                    {
                      label: "Discord Active",
                      value: report.metrics.discord.available
                        ? `${report.metrics.discord.activeOwners}/${report.metrics.discord.assignedOwners}`
                        : "No data",
                      detail:
                        "Owners with at least one message in 7 days",
                    },
                    {
                      label: "Latest Active Check",
                      value: report.metrics.activeChecks.available
                        ? `${report.metrics.activeChecks.hits}/${report.metrics.activeChecks.eligibleOwners}`
                        : "No data",
                      detail: report.metrics.activeChecks.available
                        ? `${report.metrics.activeChecks.checksTracked} recent checks tracked`
                        : "Run an active check to begin tracking",
                    },
                    {
                      label: "Owners Connected",
                      value: `${report.metrics.owners.assigned}/${report.metrics.owners.total}`,
                      detail: "Website owners assigned to NFL teams",
                    },
                  ].map((metric) => (
                    <article
                      key={metric.label}
                      className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                        {metric.label}
                      </p>
                      <p className="mt-4 text-4xl font-black">
                        {metric.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        {metric.detail}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="mt-6 grid gap-3 lg:grid-cols-3">
                {[
                  report.dataSources.games,
                  report.dataSources.discord,
                  report.dataSources.activeChecks,
                ].map((source, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl border p-4 ${sourceClasses(
                      source.ready,
                    )}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          source.ready
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        }`}
                      />
                      <span className="text-xs font-black uppercase tracking-[0.15em]">
                        {source.ready ? "Live" : "Waiting"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold">
                      {source.label}
                    </p>
                  </div>
                ))}
              </section>

              {report.dataSources.discord.lastError ? (
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100">
                  Discord sync warning:{" "}
                  {report.dataSources.discord.lastError}
                </div>
              ) : null}

              <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
                <div className="border-b border-white/10 p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-300">
                        Owner Accountability
                      </p>
                      <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                        Team-by-Team Health
                      </h2>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        placeholder="Search team or owner"
                        className="min-h-11 rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-purple-400/50"
                      />

                      <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
                        {[
                          ["all", "All"],
                          ["attention", "Attention"],
                          ["healthy", "Clear"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setFilter(
                                value as
                                  | "all"
                                  | "attention"
                                  | "healthy",
                              )
                            }
                            className={`min-h-9 rounded-lg px-3 text-xs font-black uppercase tracking-[0.1em] transition ${
                              filter === value
                                ? "bg-purple-500/20 text-purple-100"
                                : "text-zinc-600"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden grid-cols-[1.25fr_1.35fr_0.9fr_0.95fr_0.9fr_0.65fr] gap-4 border-b border-white/[0.07] px-6 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-700 lg:grid">
                  <span>Team</span>
                  <span>Owner</span>
                  <span>Actual Games</span>
                  <span>Discord</span>
                  <span>Active Checks</span>
                  <span>Health</span>
                </div>

                <div className="divide-y divide-white/[0.07]">
                  {filteredTeams.length === 0 ? (
                    <p className="p-8 text-center text-sm text-zinc-600">
                      No teams match this filter.
                    </p>
                  ) : (
                    filteredTeams.map((team) => (
                      <article
                        key={team.team.id}
                        className="grid gap-4 px-5 py-5 transition hover:bg-white/[0.025] lg:grid-cols-[1.25fr_1.35fr_0.9fr_0.95fr_0.9fr_0.65fr] lg:items-center lg:px-6"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-sm font-black">
                            {team.team.abbreviation}
                          </div>
                          <div>
                            <p className="font-black">
                              {team.team.city} {team.team.name}
                            </p>
                            {team.attention.length > 0 ? (
                              <p className="mt-1 text-xs text-red-300">
                                {team.attention[0]}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-emerald-300">
                                No action needed
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-zinc-700 lg:hidden">
                            Owner
                          </p>
                          <p className="mt-1 font-bold lg:mt-0">
                            {team.owner?.displayName ??
                              "Unassigned"}
                          </p>
                          <p className="mt-1 text-xs text-zinc-600">
                            {team.owner?.username
                              ? `@${team.owner.username}`
                              : "Connect an owner"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-zinc-700 lg:hidden">
                            Actual Games
                          </p>
                          <p
                            className={`mt-1 font-black lg:mt-0 ${
                              team.games.eligible > 0 &&
                              team.games.realPlayed === team.games.eligible
                                ? "text-emerald-300"
                                : team.games.realPlayed === 0 &&
                                    team.games.eligible >= 2
                                  ? "text-red-300"
                                  : "text-amber-200"
                            }`}
                          >
                            {gameLabel(team)}
                          </p>
                          <p className="mt-1 text-xs text-zinc-600">
                            {team.games.eligible > 0
                              ? `${team.games.fairSims} fair sim${
                                  team.games.fairSims === 1 ? "" : "s"
                                } excluded`
                              : `Week ${report.league.currentWeek}`}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-zinc-700 lg:hidden">
                            Discord
                          </p>
                          <p className="mt-1 font-black lg:mt-0">
                            {team.discord.available
                              ? `${team.discord.messages7d} msgs`
                              : "No data"}
                          </p>
                          <p className="mt-1 text-xs text-zinc-600">
                            {team.discord.available
                              ? relativeTime(
                                  team.discord.lastMessageAt,
                                )
                              : "Awaiting first sync"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-zinc-700 lg:hidden">
                            Active Checks
                          </p>
                          <p className="mt-1 font-black lg:mt-0">
                            {team.activeChecks.available
                              ? `${team.activeChecks.hits}/${team.activeChecks.total}`
                              : "No data"}
                          </p>
                          <p
                            className={`mt-1 text-xs ${
                              team.activeChecks.latest === "hit"
                                ? "text-emerald-300"
                                : team.activeChecks.latest ===
                                    "missed"
                                  ? "text-red-300"
                                  : "text-zinc-600"
                            }`}
                          >
                            {team.activeChecks.latest === "hit"
                              ? "Latest check hit"
                              : team.activeChecks.latest ===
                                  "missed"
                                ? "Latest check missed"
                                : "No check recorded"}
                          </p>
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${statusClasses(
                              team.status,
                            )}`}
                          >
                            {team.score}
                            <span className="ml-1.5 text-[9px] uppercase tracking-[0.08em]">
                              {statusLabel(team.status)}
                            </span>
                          </span>
                        </div>

                        {team.attention.length > 1 ? (
                          <div className="lg:col-span-6">
                            <div className="flex flex-wrap gap-2">
                              {team.attention
                                .slice(1)
                                .map((reason) => (
                                  <span
                                    key={reason}
                                    className="rounded-full border border-red-400/15 bg-red-400/[0.05] px-2.5 py-1 text-[10px] font-bold text-red-200"
                                  >
                                    {reason}
                                  </span>
                                ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="mt-6 grid gap-4 sm:grid-cols-3">
                <Link
                  href="/active-checks"
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-purple-400/30 hover:bg-purple-400/[0.07]"
                >
                  <p className="font-black">Active Checks</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Start or review the current owner check.
                  </p>
                </Link>

                <Link
                  href="/schedule"
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-purple-400/30 hover:bg-purple-400/[0.07]"
                >
                  <p className="font-black">League Schedule</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Review completed and pending games.
                  </p>
                </Link>

                <Link
                  href="/commissioner/owner-connections"
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-purple-400/30 hover:bg-purple-400/[0.07]"
                >
                  <p className="font-black">Owner Connections</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Fix missing website-to-team assignments.
                  </p>
                </Link>
              </section>

              <p className="mt-6 text-center text-xs text-zinc-700">
                Report generated {dateLabel(report.generatedAt)}.
                Discord message content is never stored—only author,
                channel and timestamp metadata.
              </p>
            </>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
