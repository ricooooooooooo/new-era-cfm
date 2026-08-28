"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import AppLayout from "@/app/components/layout/AppLayout";

type SyncResult = {
  totalTeams: number;
  assignedTeams: number;
  missingTeams: number;
  connectedMembers: number;
  duplicatesResolved: number;
  changedAssignments: number;
  assignments: {
    teamSlug: string;
    teamName: string;
    abbreviation: string;
    memberId: string;
    discordId: string;
    displayName: string;
  }[];
  missing: {
    teamSlug: string;
    teamName: string;
    abbreviation: string;
  }[];
  duplicates: {
    teamSlug: string;
    teamName: string;
    selected: string;
    ignored: string[];
  }[];
};

export default function OwnerRoleSyncPage() {
  const [result, setResult] =
    useState<SyncResult | null>(null);
  const [syncing, setSyncing] =
    useState(false);
  const [error, setError] = useState("");
  const autoRan = useRef(false);

  const runSync = useCallback(async () => {
    if (syncing) return;

    setSyncing(true);
    setError("");

    try {
      const response = await fetch(
        "/api/commissioner/owner-connections/sync-all",
        {
          method: "POST",
          cache: "no-store",
        },
      );

      const payload = (await response.json()) as {
        success: boolean;
        result?: SyncResult;
        error?: string;
      };

      if (
        !response.ok ||
        !payload.success ||
        !payload.result
      ) {
        throw new Error(
          payload.error ??
            "Unable to synchronize owners.",
        );
      }

      setResult(payload.result);
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Unable to synchronize owners.",
      );
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    if (autoRan.current) return;

    autoRan.current = true;
    void runSync();
  }, [runSync]);

  return (
    <AppLayout>
      <main className="min-h-[calc(100vh-8rem)] bg-[#050606] text-white">
        <section className="relative overflow-hidden border-b border-white/10 bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_5%,rgba(124,58,237,0.34),transparent_32rem),radial-gradient(circle_at_88%_8%,rgba(245,158,11,0.16),transparent_28rem)]" />

          <div className="relative mx-auto max-w-6xl px-5 py-11 sm:px-8 sm:py-14">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">
              Owner Connection Repair
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
              Sync All Team Owners
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              Rebuild the official team-owner map
              from every connected member&apos;s
              saved Discord team assignment.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
          {error ? (
            <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-100">
              {error}
            </div>
          ) : null}

          {syncing ? (
            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/[0.07] p-12 text-center">
              <p className="text-xl font-black">
                Synchronizing all connected
                owners...
              </p>
              <p className="mt-3 text-sm text-zinc-500">
                Fixing stale team assignments and
                rebuilding League Health.
              </p>
            </div>
          ) : result ? (
            <>
              <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-6 text-emerald-100">
                <p className="text-xl font-black">
                  Owner synchronization complete.
                </p>
                <p className="mt-2 text-sm">
                  League Health now reads the same
                  team ownership as the connected
                  member system.
                </p>
              </div>

              <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    "Teams Assigned",
                    `${result.assignedTeams}/${result.totalTeams}`,
                  ],
                  [
                    "Assignments Fixed",
                    result.changedAssignments,
                  ],
                  [
                    "Missing Owners",
                    result.missingTeams,
                  ],
                  [
                    "Duplicates Resolved",
                    result.duplicatesResolved,
                  ],
                ].map(([label, value]) => (
                  <article
                    key={label}
                    className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                      {label}
                    </p>
                    <p className="mt-3 text-4xl font-black">
                      {value}
                    </p>
                  </article>
                ))}
              </section>

              <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
                <div className="border-b border-white/10 p-5 sm:p-6">
                  <h2 className="text-2xl font-black">
                    Official Assignments
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    These are now the owners used by
                    League Health, schedules, trades
                    and team pages.
                  </p>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {result.assignments.map(
                    (assignment) => (
                      <div
                        key={
                          assignment.abbreviation
                        }
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-4"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black">
                          {
                            assignment.abbreviation
                          }
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-black">
                            {assignment.teamName}
                          </p>
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            {assignment.displayName}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>

              {result.missing.length > 0 ? (
                <section className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/[0.06] p-5 sm:p-6">
                  <h2 className="text-xl font-black text-amber-100">
                    Still Missing
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.missing.map((team) => (
                      <span
                        key={team.abbreviation}
                        className="rounded-full border border-amber-400/20 bg-black/20 px-3 py-1.5 text-xs font-bold text-amber-100"
                      >
                        {team.teamName}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              {result.duplicates.length > 0 ? (
                <section className="mt-6 rounded-3xl border border-red-400/20 bg-red-400/[0.06] p-5 sm:p-6">
                  <h2 className="text-xl font-black text-red-100">
                    Duplicate Connections Resolved
                  </h2>

                  <div className="mt-4 space-y-3">
                    {result.duplicates.map(
                      (duplicate) => (
                        <div
                          key={duplicate.teamSlug}
                          className="rounded-2xl border border-red-400/15 bg-black/20 p-4 text-sm"
                        >
                          <p className="font-black">
                            {duplicate.teamName}
                          </p>
                          <p className="mt-2 text-zinc-400">
                            Kept:{" "}
                            <span className="font-bold text-white">
                              {
                                duplicate.selected
                              }
                            </span>
                          </p>
                          <p className="mt-1 text-zinc-500">
                            Removed duplicate:{" "}
                            {duplicate.ignored.join(
                              ", ",
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </section>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Link
                  href="/commissioner/league-health"
                  className="rounded-2xl bg-[linear-gradient(135deg,#6d28d9,#9333ea,#d97706)] p-4 text-center text-sm font-black uppercase tracking-[0.1em]"
                >
                  Open League Health
                </Link>

                <Link
                  href="/commissioner/owner-connections"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm font-black"
                >
                  Owner Connections
                </Link>

                <button
                  type="button"
                  onClick={() => void runSync()}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-black"
                >
                  Run Again
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void runSync()}
              className="min-h-14 w-full rounded-2xl bg-amber-600 px-5 font-black"
            >
              Sync All Owners
            </button>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
