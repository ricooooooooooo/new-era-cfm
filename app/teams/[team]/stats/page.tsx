import { notFound } from "next/navigation";

import TeamPageShell from "@/app/components/team/TeamPageShell";
import { getTeamBySlug } from "@/app/data/teams";
import {
  getLiveTeamStats,
  type PlayerStatLine,
} from "@/lib/madden/live-team-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StatsPageProps = {
  params: Promise<{
    team: string;
  }>;
};

function LeaderCard({
  title,
  players,
  value,
}: {
  title: string;
  players: PlayerStatLine[];
  value: (player: PlayerStatLine) => string;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
        {title}
      </p>

      <div className="mt-4 space-y-3">
        {players.length ? (
          players.slice(0, 5).map((player, index) => (
            <div
              key={`${title}-${player.rosterId}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-black">
                  {index + 1}. {player.name}
                </p>
              </div>

              <p className="shrink-0 font-black text-white">
                {value(player)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-600">
            No recorded production yet.
          </p>
        )}
      </div>
    </section>
  );
}

export default async function StatsPage({
  params,
}: StatsPageProps) {
  const { team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);

  if (!team) notFound();

  const stats = await getLiveTeamStats(team.short);

  return (
    <TeamPageShell team={team} activeTab="stats">
      {!stats ? (
        <section className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/[0.05] p-8">
          <p className="font-black text-amber-200">
            Live stats have not been returned for this team yet.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-6">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-red-500">
              Live Madden 27 Statistics
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Season {stats.season} • Through Week{" "}
              {stats.currentWeek}
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [
                  "Record",
                  `${stats.record.wins}-${stats.record.losses}${
                    stats.record.ties
                      ? `-${stats.record.ties}`
                      : ""
                  }`,
                ],
                [
                  "Points / Game",
                  stats.teamStats.pointsPerGame.toFixed(1),
                ],
                [
                  "Allowed / Game",
                  stats.teamStats.pointsAllowedPerGame.toFixed(1),
                ],
                [
                  "Turnover Diff",
                  `${
                    stats.teamStats.takeaways -
                      stats.teamStats.giveaways >=
                    0
                      ? "+"
                      : ""
                  }${
                    stats.teamStats.takeaways -
                    stats.teamStats.giveaways
                  }`,
                ],
                [
                  "Passing Yards",
                  stats.teamStats.passingYards.toLocaleString(),
                ],
                [
                  "Rushing Yards",
                  stats.teamStats.rushingYards.toLocaleString(),
                ],
                [
                  "Total Offense",
                  stats.teamStats.totalYards.toLocaleString(),
                ],
                [
                  "Defensive Sacks",
                  stats.teamStats.sacks.toString(),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                    {label}
                  </p>
                  <p className="mt-3 text-3xl font-black">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <LeaderCard
              title="Passing"
              players={stats.leaders.passing}
              value={(player) =>
                `${player.passYds.toLocaleString()} YDS • ${
                  player.passTDs
                } TD`
              }
            />

            <LeaderCard
              title="Rushing"
              players={stats.leaders.rushing}
              value={(player) =>
                `${player.rushYds.toLocaleString()} YDS • ${
                  player.rushTDs
                } TD`
              }
            />

            <LeaderCard
              title="Receiving"
              players={stats.leaders.receiving}
              value={(player) =>
                `${player.recYds.toLocaleString()} YDS • ${
                  player.recTDs
                } TD`
              }
            />

            <LeaderCard
              title="Sacks"
              players={stats.leaders.sacks}
              value={(player) =>
                `${player.sacks.toFixed(1)} SACK`
              }
            />

            <LeaderCard
              title="Interceptions"
              players={stats.leaders.interceptions}
              value={(player) =>
                `${player.interceptions} INT`
              }
            />

            <LeaderCard
              title="Tackles"
              players={stats.leaders.tackles}
              value={(player) =>
                `${player.tackles} TKL`
              }
            />
          </section>
        </>
      )}
    </TeamPageShell>
  );
}
