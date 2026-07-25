import { notFound } from "next/navigation";
import TeamPageShell, {
  TeamDataPlaceholder,
} from "@/app/components/team/TeamPageShell";
import { getTeamBySlug } from "@/app/data/teams";

type StatsPageProps = {
  params: Promise<{
    team: string;
  }>;
};

export default async function StatsPage({ params }: StatsPageProps) {
  const { team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);

  if (!team) {
    notFound();
  }

  return (
    <TeamPageShell team={team} activeTab="stats">
      <TeamDataPlaceholder
        eyebrow="Team Statistics"
        title="Statistics waiting for league sync"
        description="Team offense, defense, turnovers, scoring, league rankings, and individual statistical leaders will populate here."
        items={[
          "Passing",
          "Rushing",
          "Receiving",
          "Scoring",
          "Turnovers",
          "Sacks",
          "Interceptions",
          "Total Offense",
          "Total Defense",
          "League Rankings",
          "Red Zone",
          "Third Down",
        ]}
      />
    </TeamPageShell>
  );
}