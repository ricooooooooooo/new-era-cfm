import { notFound } from "next/navigation";
import TeamPageShell, {
  TeamDataPlaceholder,
} from "@/app/components/team/TeamPageShell";
import { getTeamBySlug, teams } from "@/app/data/teams";

type TeamPageProps = {
  params: Promise<{
    team: string;
  }>;
};

export function generateStaticParams() {
  return teams.map((team) => ({
    team: team.slug,
  }));
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);

  if (!team) {
    notFound();
  }

  return (
    <TeamPageShell team={team} activeTab="overview">
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Offense Rank" />
        <StatCard label="Defense Rank" />
        <StatCard label="Points Per Game" />
        <StatCard label="Salary Cap" />
      </section>

      <TeamDataPlaceholder
        eyebrow="Franchise Overview"
        title="League connection pending"
        description="Owner assignment, team record, rankings, salary information, recent results, and upcoming games will appear here after NEW ERA connects its Madden 27 franchise."
        items={[
          "Current Record",
          "Assigned Owner",
          "Recent Results",
          "Upcoming Matchup",
          "Team Rankings",
          "Salary Overview",
        ]}
      />

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <InfoCard label="Conference" value={team.conference} />
        <InfoCard label="Division" value={team.division} />
        <InfoCard label="Franchise Status" value="Not assigned" muted />
      </section>
    </TeamPageShell>
  );
}

function StatCard({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black text-zinc-600">—</p>

      <p className="mt-2 text-xs font-bold text-zinc-700">Not synced</p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-3 text-2xl font-black ${
          muted ? "text-zinc-500" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}