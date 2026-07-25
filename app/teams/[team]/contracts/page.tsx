import { notFound } from "next/navigation";
import TeamPageShell, {
  TeamDataPlaceholder,
} from "@/app/components/team/TeamPageShell";
import { getTeamBySlug } from "@/app/data/teams";

type ContractsPageProps = {
  params: Promise<{
    team: string;
  }>;
};

export default async function ContractsPage({
  params,
}: ContractsPageProps) {
  const { team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);

  if (!team) {
    notFound();
  }

  return (
    <TeamPageShell team={team} activeTab="contracts">
      <TeamDataPlaceholder
        eyebrow="Contracts"
        title="Contracts waiting for league sync"
        description="Player salaries, remaining contract years, bonuses, cap penalties, available cap space, and upcoming free agents will populate here."
        items={[
          "Available Cap Space",
          "Player Salaries",
          "Contract Years",
          "Signing Bonuses",
          "Cap Penalties",
          "Upcoming Free Agents",
          "Highest-Paid Players",
          "Expiring Contracts",
          "Team-Friendly Deals",
        ]}
      />
    </TeamPageShell>
  );
}