"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { teams } from "../data/teams";

function teamCardLogo(abbreviation: string) {
  return `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${abbreviation}`;
}


type LeagueSummary = {
  success: boolean;
  league: {
    id: string | null;
    name: string;
    currentWeek: number | null;
    season: number | null;
  };
  counts: {
    members: number;
    totalTeams: number;
    claimedTeams: number;
    openTeams: number;
    gamesPlayed: number;
  };
  teams: Array<{
    slug: string;
    abbreviation: string;
    claimed: boolean;
    owner: string | null;
    wins: number;
    losses: number;
    ties: number;
    gamesPlayed: number;
    pointsFor: number;
    pointsAgainst: number;
    pointDifferential: number;
    pointsPerGame: number;
    pointsAllowedPerGame: number;
    overall: number | null;
  }>;
  syncStatus: string;
};

export default function TeamsPage() {
  const [summary, setSummary] = useState<LeagueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadLeagueSummary() {
      try {
        const response = await fetch("/api/league/summary", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load league summary.");
        }

        const data = (await response.json()) as LeagueSummary;

        if (active) {
          setSummary(data);
          setLoadError(false);
        }
      } catch (error) {
        console.error("Failed to load league summary:", error);

        if (active) {
          setLoadError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLeagueSummary();

    return () => {
      active = false;
    };
  }, []);

  const totalTeams = summary?.counts.totalTeams ?? teams.length;
  const claimedTeams = summary?.counts.claimedTeams ?? 0;
  const openTeams = summary?.counts.openTeams ?? totalTeams;
  const currentWeek = summary?.league.currentWeek;

const liveTeams = new Map(
  (summary?.teams ?? []).map((team) => [team.slug, team]),
);

const getLiveTeam = (slug: string) => liveTeams.get(slug);

  /*
   * Individual team-owner assignments are not connected yet.
   * Until that API exists, every franchise card displays an honest
   * "Not Assigned" state instead of using fake data from teams.ts.
   */
  const visibleTeams = showOpenOnly
  ? teams.filter((team) => !getLiveTeam(team.slug)?.claimed)
  : teams;

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-red-500">
              Gold Jacket CFM
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              League Teams
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              View all 32 franchises. Team owners, records, schedules, and
              standings will populate as league data is connected.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowOpenOnly(false)}
              className={`rounded-xl px-5 py-3 text-sm font-black transition ${
                !showOpenOnly
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white"
              }`}
            >
              All Teams
            </button>

            <button
              type="button"
              onClick={() => setShowOpenOnly(true)}
              className={`rounded-xl px-5 py-3 text-sm font-black transition ${
                showOpenOnly
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white"
              }`}
            >
              Open Teams
            </button>
          </div>
        </section>

        {loadError && (
          <section className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm font-bold text-red-300">
              League totals could not be loaded. The franchise list is still
              available below.
            </p>
          </section>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Teams"
            value={loading ? "—" : String(totalTeams)}
          />

          <SummaryCard
            label="Claimed"
            value={loading ? "—" : String(claimedTeams)}
          />

          <SummaryCard
            label="Open Teams"
            value={loading ? "—" : String(openTeams)}
            valueClassName="text-red-500"
          />

          <SummaryCard
            label="Current Week"
            value={
              loading
                ? "—"
                : currentWeek !== null && currentWeek !== undefined
                  ? `Week ${currentWeek}`
                  : "Not synced"
            }
            smallValue={currentWeek === null || currentWeek === undefined}
          />
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-black text-white">
                League ownership is live
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Connected Discord members:{" "}
                <span className="font-bold text-zinc-300">
                  {loading ? "—" : (summary?.counts.members ?? 0)}
                </span>
              </p>
            </div>

            <span className="w-fit rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.15em] text-amber-300">
              Live Madden data
            </span>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleTeams.map((team) => (
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
                    <img
                    src={teamCardLogo(team.short)}
                    alt={`${team.city} ${team.name}`}
                    className="h-12 w-12 object-contain"
                  />
                  </div>

                  <span className="rounded-lg bg-zinc-900/90 px-3 py-2 text-xs font-black text-zinc-400">
                    {getLiveTeam(team.slug)?.claimed ? "CLAIMED" : "OPEN"}
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

                    <p className="mt-2 text-2xl font-black text-white">
                  {(() => {
                    const live = getLiveTeam(team.slug);
                    if (!live) return "—";
                    return live.ties
                      ? `${live.wins}-${live.losses}-${live.ties}`
                      : `${live.wins}-${live.losses}`;
                  })()}
                </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
                      Owner
                    </p>

                    <p className="mt-2 truncate text-lg font-black text-zinc-400">
                      Not assigned
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

type SummaryCardProps = {
  label: string;
  value: string;
  valueClassName?: string;
  smallValue?: boolean;
};

function SummaryCard({
  label,
  value,
  valueClassName = "",
  smallValue = false,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-2 font-black ${
          smallValue ? "text-2xl" : "text-4xl"
        } ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}