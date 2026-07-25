import { notFound } from "next/navigation";
import TeamPageShell, {
  TeamDataPlaceholder,
} from "@/app/components/team/TeamPageShell";
import { getTeamBySlug } from "@/app/data/teams";

type RosterPageProps = {
  params: Promise<{
    team: string;
  }>;
};

export default async function RosterPage({ params }: RosterPageProps) {
  const { team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);

  if (!team) {
    notFound();
  }

  return (
    <TeamPageShell team={team} activeTab="roster">
      <TeamDataPlaceholder
        eyebrow="Franchise Roster"
        title="Roster waiting for league sync"
        description="Player names, positions, ratings, development traits, jersey numbers, and roster status will populate here after the first Madden 27 Snallabot import."
        items={[
          "Quarterbacks",
          "Running Backs",
          "Wide Receivers",
          "Tight Ends",
          "Offensive Line",
          "Defensive Line",
          "Linebackers",
          "Cornerbacks",
          "Safeties",
          "Special Teams",
          "Practice Squad",
          "Injured Reserve",
        ]}
      />
    </TeamPageShell>
  );
}