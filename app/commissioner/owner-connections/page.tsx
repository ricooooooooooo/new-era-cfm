"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "@/app/components/layout/AppLayout";

type Member = {
  id: string;
  discord_id: string;
  discord_username: string | null;
  display_name: string | null;
  avatar_hash: string | null;
  first_connected_at: string | null;
  last_seen_at: string | null;
};

type TeamAudit = {
  slug: string;
  city: string;
  name: string;
  fullName: string;
  abbreviation: string;
  primary: string;
  secondary: string;
  status: "linked" | "missing" | "duplicate";
  owner: Member | null;
  duplicates: Member[];
};

type AuditResponse = {
  success: boolean;
  summary?: {
    totalTeams: number;
    claimedTeams: number;
    linked: number;
    missing: number;
    duplicate: number;
    prizePot: number;
    connectionPercent: number;
  };
  teams?: TeamAudit[];
  checkedAt?: string;
  error?: string;
};

type Filter = "all" | "missing" | "linked" | "duplicate";

function ownerName(owner: Member | null) {
  return (
    owner?.display_name?.trim() ||
    owner?.discord_username?.trim() ||
    "Not linked"
  );
}

function avatar(owner: Member | null) {
  if (!owner?.avatar_hash) {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  return `https://cdn.discordapp.com/avatars/${owner.discord_id}/${owner.avatar_hash}.png?size=128`;
}

function logo(abbreviation: string) {
  return `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${abbreviation}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusMeta(status: TeamAudit["status"]) {
  if (status === "linked") {
    return {
      label: "Discord Linked",
      badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
      dot: "bg-emerald-400",
      border: "border-emerald-400/15",
    };
  }

  if (status === "duplicate") {
    return {
      label: "Duplicate",
      badge: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      dot: "bg-amber-300",
      border: "border-amber-300/20",
    };
  }

  return {
    label: "Not Linked",
    badge: "border-red-400/25 bg-red-400/10 text-red-200",
    dot: "bg-red-400",
    border: "border-red-400/20",
  };
}

export default function OwnerConnectionsPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const loadAudit = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/commissioner/owner-connections?t=${Date.now()}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as AuditResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error === "commissioner_access_required"
            ? "Commissioner access is required."
            : "Unable to load the connection audit.",
        );
      }

      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the connection audit.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const filteredTeams = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return (data?.teams ?? []).filter((team) => {
      if (filter !== "all" && team.status !== filter) return false;
      if (!normalized) return true;

      return [
        team.fullName,
        team.abbreviation,
        team.owner?.display_name,
        team.owner?.discord_username,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [data, filter, search]);

  async function copyMissingTeams() {
    const missing = (data?.teams ?? []).filter(
      (team) => team.status === "missing",
    );

    const text =
      missing.length === 0
        ? "All 32 Gold Jacket owners have linked Discord."
        : [
            `GOLD JACKET — MISSING DISCORD LINKS (${missing.length})`,
            "",
            ...missing.map(
              (team, index) => `${index + 1}. ${team.fullName}`,
            ),
          ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied("missing");
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Clipboard access was blocked.");
    }
  }

  async function copyReminder() {
    const names = (data?.teams ?? [])
      .filter((team) => team.status === "missing")
      .map((team) => team.name);

    const text =
      names.length === 0
        ? "All 32 Gold Jacket owners are linked."
        : `The following GOLD JACKET owners still need to link Discord on the website: ${names.join(", ")}.\n\nSign into the GOLD JACKET website with Discord while holding your team role before launch.`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied("reminder");
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Clipboard access was blocked.");
    }
  }

  const summary = data?.summary;

  return (
    <AppLayout>
      <main className="min-h-[calc(100vh-8rem)] bg-[#050606] text-white">
        <section className="relative overflow-hidden border-b border-white/10 bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(124,58,237,0.33),transparent_34rem),radial-gradient(circle_at_88%_10%,rgba(245,158,11,0.17),transparent_28rem)]" />
          <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-purple-300">
                  Commissioner Owner Audit
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                  32/32 Owner Connections
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                  Every franchise is claimed. This shows exactly which owners
                  completed the website Discord connection.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void copyMissingTeams()}
                  className="min-h-12 rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-black transition active:scale-[0.98] active:bg-white/[0.12]"
                >
                  {copied === "missing" ? "Copied!" : "Copy Missing Teams"}
                </button>
                <button
                  type="button"
                  onClick={() => void loadAudit(true)}
                  disabled={refreshing}
                  className="min-h-12 rounded-xl bg-purple-600 px-5 py-3 text-sm font-black uppercase tracking-[0.1em] transition hover:bg-purple-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {refreshing ? "Refreshing..." : "Refresh Audit"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
          {error ? (
            <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center text-zinc-500">
              Checking all 32 teams...
            </div>
          ) : !summary ? (
            <div className="rounded-3xl border border-red-400/20 bg-red-400/[0.06] p-10 text-center font-black">
              Owner connection data is unavailable.
            </div>
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ["Teams Claimed", `${summary.claimedTeams}/32`, "text-white"],
                  ["Discord Linked", summary.linked, "text-emerald-300"],
                  ["Still Missing", summary.missing, summary.missing ? "text-red-300" : "text-emerald-300"],
                  ["Duplicates", summary.duplicate, summary.duplicate ? "text-amber-200" : "text-zinc-300"],
                  ["Prize Pot", `$${summary.prizePot}`, "text-amber-200"],
                ].map(([label, value, valueClass]) => (
                  <article
                    key={String(label)}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                      {label}
                    </p>
                    <p className={`mt-3 text-3xl font-black ${valueClass}`}>
                      {value}
                    </p>
                  </article>
                ))}
              </section>

              {summary.missing > 0 ? (
                <section className="mt-6 rounded-3xl border border-red-400/20 bg-red-400/[0.055] p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-red-200">
                        Action Needed
                      </p>
                      <h2 className="mt-2 text-2xl font-black">
                        {summary.missing} owner{summary.missing === 1 ? "" : "s"} still need to link
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyReminder()}
                      className="min-h-12 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-black text-red-100 transition active:scale-[0.98]"
                    >
                      {copied === "reminder" ? "Reminder Copied!" : "Copy Reminder Message"}
                    </button>
                  </div>
                </section>
              ) : (
                <section className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.055] p-6 text-center text-2xl font-black text-emerald-100">
                  All 32 team owners are linked and ready.
                </section>
              )}

              <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["all", "All 32"],
                      ["missing", `Missing ${summary.missing}`],
                      ["linked", `Linked ${summary.linked}`],
                      ["duplicate", `Duplicates ${summary.duplicate}`],
                    ] as [Filter, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-black transition active:scale-[0.98] ${
                          filter === value
                            ? "border-purple-400/40 bg-purple-500/15 text-purple-100"
                            : "border-white/10 bg-white/[0.035] text-zinc-500"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search team or owner..."
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-purple-400/40 lg:max-w-sm"
                  />
                </div>
              </section>

              <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredTeams.map((team) => {
                  const meta = statusMeta(team.status);

                  return (
                    <article
                      key={team.slug}
                      className={`relative overflow-hidden rounded-3xl border bg-[#0d0f10] p-5 ${meta.border}`}
                    >
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-30"
                        style={{
                          background: `radial-gradient(circle at 18% 0%, ${team.primary}, transparent 65%)`,
                        }}
                      />

                      <div className="relative">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/35 p-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={logo(team.abbreviation)}
                                alt={`${team.fullName} logo`}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                                {team.abbreviation}
                              </p>
                              <h2 className="mt-1 text-xl font-black leading-tight">
                                {team.fullName}
                              </h2>
                            </div>
                          </div>
                          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                        </div>

                        <span className={`mt-5 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${meta.badge}`}>
                          {meta.label}
                        </span>

                        {team.owner ? (
                          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/25 p-3.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={avatar(team.owner)}
                              alt={`${ownerName(team.owner)} avatar`}
                              className="h-12 w-12 shrink-0 rounded-xl border border-white/10 object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-black">
                                {ownerName(team.owner)}
                              </p>
                              <p className="mt-1 truncate text-xs text-zinc-600">
                                @{team.owner.discord_username ?? "unknown"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 rounded-2xl border border-dashed border-red-400/20 bg-red-400/[0.04] p-4">
                            <p className="font-black text-red-100">
                              No linked owner found
                            </p>
                            <p className="mt-2 text-xs leading-5 text-zinc-600">
                              The owner must sign into the website while holding this team role.
                            </p>
                          </div>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-700">
                              First Linked
                            </p>
                            <p className="mt-2 truncate text-xs font-bold text-zinc-400">
                              {formatDate(team.owner?.first_connected_at)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-700">
                              Last Seen
                            </p>
                            <p className="mt-2 truncate text-xs font-bold text-zinc-400">
                              {formatDate(team.owner?.last_seen_at)}
                            </p>
                          </div>
                        </div>

                        {team.duplicates.length > 0 ? (
                          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-100">
                              Additional Linked Accounts
                            </p>
                            {team.duplicates.map((member) => (
                              <p key={member.id} className="mt-2 text-sm text-zinc-400">
                                {ownerName(member)} @{member.discord_username ?? "unknown"}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </section>

              <p className="mt-6 text-center text-xs text-zinc-700">
                Last checked {formatDate(data?.checkedAt)}
              </p>
            </>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
