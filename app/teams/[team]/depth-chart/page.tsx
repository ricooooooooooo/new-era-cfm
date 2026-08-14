import Link from "next/link";
import { notFound } from "next/navigation";

import TeamPageShell from "@/app/components/team/TeamPageShell";
import { getTeamBySlug } from "@/app/data/teams";
import { getCurrentMaddenPlayers } from "@/lib/madden/player-data";
import type { CurrentMaddenPlayer } from "@/lib/madden/types";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DepthChartPageProps = {
  params: Promise<{
    team: string;
  }>;
};

const groups = [
  {
    label: "Offense",
    positions: [
      "QB",
      "HB",
      "RB",
      "FB",
      "WR",
      "TE",
      "LT",
      "LG",
      "C",
      "RG",
      "RT",
    ],
  },
  {
    label: "Defense",
    positions: [
      "LE",
      "RE",
      "EDGE",
      "DT",
      "LOLB",
      "MLB",
      "ROLB",
      "LB",
      "CB",
      "FS",
      "SS",
    ],
  },
  {
    label: "Special Teams",
    positions: ["K", "P"],
  },
];

async function getLeagueId() {
  const result = await supabaseAdmin
    .from("leagues")
    .select("id")
    .eq("slug", "new-era-cfm")
    .maybeSingle();

  if (result.error) throw result.error;

  return result.data?.id ?? null;
}

function depthForPosition(
  players: CurrentMaddenPlayer[],
  position: string,
) {
  return players
    .filter(
      (player) =>
        player.position?.toUpperCase() === position,
    )
    .sort(
      (a, b) =>
        (b.overall ?? -1) - (a.overall ?? -1),
    )
    .slice(0, 4);
}

export default async function DepthChartPage({
  params,
}: DepthChartPageProps) {
  const { team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);

  if (!team) notFound();

  const leagueId = await getLeagueId();

  const players = await getCurrentMaddenPlayers({
    leagueId,
    teamAbbreviation: team.short,
    limit: 100,
  });

  return (
    <TeamPageShell
      team={team}
      activeTab="depth-chart"
    >
      <section className="mt-6">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-red-500">
          Live Madden 27 Depth Chart
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Current Franchise Personnel
        </h2>

        <p className="mt-3 text-sm text-zinc-500">
          Depth is projected from the current New Era
          franchise roster and sorted by live Madden OVR.
        </p>

        <div className="mt-7 space-y-8">
          {groups.map((group) => {
            const visiblePositions =
              group.positions
                .map((position) => ({
                  position,
                  players: depthForPosition(
                    players,
                    position,
                  ),
                }))
                .filter(
                  (entry) =>
                    entry.players.length > 0,
                );

            if (!visiblePositions.length) {
              return null;
            }

            return (
              <section key={group.label}>
                <h3 className="text-2xl font-black">
                  {group.label}
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visiblePositions.map(
                    ({ position, players: depth }) => (
                      <div
                        key={position}
                        className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xl font-black">
                            {position}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                            Depth
                          </p>
                        </div>

                        <div className="mt-4 space-y-2">
                          {depth.map(
                            (player, index) => (
                              <Link
                                key={player.id}
                                href={`/players/${player.id}`}
                                className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-3 transition hover:border-white/20"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-black">
                                  {index + 1}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-black">
                                    {player.name}
                                  </p>
                                  <p className="mt-0.5 text-xs text-zinc-600">
                                    #
                                    {player.jerseyNumber ??
                                      "—"}{" "}
                                    •{" "}
                                    {player.devTrait ??
                                      "Normal"}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="text-xl font-black">
                                    {player.overall ??
                                      "—"}
                                  </p>
                                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                                    OVR
                                  </p>
                                </div>
                              </Link>
                            ),
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </TeamPageShell>
  );
}
