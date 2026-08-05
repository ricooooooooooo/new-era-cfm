import { notFound, redirect } from "next/navigation";
import { findTeamBySlug } from "@/lib/nfl-teams";

type TeamSchedulePageProps = {
  params: Promise<{
    team: string;
  }>;
};

export default async function TeamSchedulePage({
  params,
}: TeamSchedulePageProps) {
  const { team: teamSlug } = await params;
  const team = findTeamBySlug(teamSlug);

  if (!team) notFound();

  redirect(`/schedule?team=${team.abbreviation}`);
}
