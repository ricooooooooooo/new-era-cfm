import { notFound } from "next/navigation";
import TeamPageShell, {
  TeamDataPlaceholder,
} from "@/app/components/team/TeamPageShell";
import { getTeamBySlug } from "@/app/data/teams";

type SchedulePageProps = {
  params: Promise<{
    team: string;
  }>;
};

export default async function SchedulePage({ params }: SchedulePageProps) {
  const { team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);

  if (!team) {
    notFound();
  }

  return (
    <TeamPageShell team={team} activeTab="schedule">
      <TeamDataPlaceholder
        eyebrow="Team Schedule"
        title="Schedule waiting for league sync"
        description="Weekly opponents, home and away games, results, deadlines, primetime matchups, and playoff games will populate here."
        items={[
          "Regular Season",
          "Home Games",
          "Away Games",
          "Completed Games",
          "Upcoming Games",
          "Primetime Games",
          "Game Deadlines",
          "Playoff Schedule",
          "Final Scores",
        ]}
      />
    </TeamPageShell>
  );
}