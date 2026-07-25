import { notFound } from "next/navigation";
import TeamPageShell, {
  TeamDataPlaceholder,
} from "@/app/components/team/TeamPageShell";
import { getTeamBySlug } from "@/app/data/teams";

type DraftPicksPageProps = {
  params: Promise<{
    team: string;
  }>;
};

export default async function DraftPicksPage({
  params,
}: DraftPicksPageProps) {
  const { team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);

  if (!team) {
    notFound();
  }

  return (
    <TeamPageShell team={team} activeTab="draft-picks">
      <TeamDataPlaceholder
        eyebrow="Draft Capital"
        title="Draft picks waiting for league sync"
        description="Owned selections, traded selections, future picks, completed draft history, and acquired draft capital will populate here."
        items={[
          "Current Draft",
          "Round 1",
          "Rounds 2–3",
          "Rounds 4–7",
          "Traded Picks",
          "Acquired Picks",
          "Future Picks",
          "Draft History",
          "Recent Selections",
        ]}
      />
    </TeamPageShell>
  );
}