import { notFound } from "next/navigation";
import TeamPageShell, {
  TeamDataPlaceholder,
} from "@/app/components/team/TeamPageShell";
import { getTeamBySlug } from "@/app/data/teams";

type DepthChartPageProps = {
  params: Promise<{
    team: string;
  }>;
};

export default async function DepthChartPage({
  params,
}: DepthChartPageProps) {
  const { team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);

  if (!team) {
    notFound();
  }

  return (
    <TeamPageShell team={team} activeTab="depth-chart">
      <TeamDataPlaceholder
        eyebrow="Depth Chart"
        title="Depth chart waiting for league sync"
        description="Starters, backups, specialists, injuries, and position-by-position depth will populate here."
        items={[
          "Offense",
          "Defense",
          "Special Teams",
          "Quarterbacks",
          "Skill Positions",
          "Offensive Line",
          "Defensive Front",
          "Linebackers",
          "Secondary",
          "Specialists",
          "Injuries",
          "Position Battles",
        ]}
      />
    </TeamPageShell>
  );
}