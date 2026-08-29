import { notFound } from "next/navigation";
import AppLayout from "@/app/components/layout/AppLayout";
import GoldJacketTeamClient from "./GoldJacketTeamClient";
import { getTeamGoldJacketCandidates } from "@/lib/gold-jackets/catalog";
import { findTeamBySlug } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LEAGUE_KEY = process.env.GOLD_JACKET_LEAGUE_KEY || "gold-jacket-cfm";

type TeamPageProps = {
  params: Promise<{ team: string }>;
};

type ClaimRow = {
  id: string;
  team_slug: string;
  candidate_key: string;
  player_name: string;
  player_position: string;
  display_name: string;
  claimed_at: string;
};

export default async function GoldJacketTeamPage({ params }: TeamPageProps) {
  const { team: teamSlug } = await params;
  const team = findTeamBySlug(teamSlug);
  if (!team) notFound();

  const candidates = getTeamGoldJacketCandidates(team.slug);
  if (candidates.length === 0) notFound();

  const { data, error } = await supabaseAdmin
    .from("gold_jacket_claims")
    .select(
      "id, team_slug, candidate_key, player_name, player_position, display_name, claimed_at",
    )
    .eq("league_key", LEAGUE_KEY)
    .order("claimed_at", { ascending: true });

  if (error) {
    console.error(`Unable to load ${team.name} Gold Jacket room:`, error);
  }

  const claims = (data ?? []) as ClaimRow[];
  const existingClaim = claims.find((claim) => claim.team_slug === team.slug) ?? null;

  return (
    <AppLayout>
      <GoldJacketTeamClient
        team={{
          slug: team.slug,
          city: team.city,
          name: team.name,
          abbreviation: team.abbreviation,
          primary: team.primary,
          secondary: team.secondary,
        }}
        candidates={candidates.map((candidate) => ({
          key: candidate.key,
          name: candidate.name,
          position: candidate.position,
          hofClass: candidate.hofClass ?? null,
        }))}
        claims={claims.map((claim) => ({
          id: claim.id,
          teamSlug: claim.team_slug,
          candidateKey: claim.candidate_key,
          playerName: claim.player_name,
          playerPosition: claim.player_position,
          displayName: claim.display_name,
          claimedAt: claim.claimed_at,
        }))}
        existingClaim={
          existingClaim
            ? {
                id: existingClaim.id,
                teamSlug: existingClaim.team_slug,
                candidateKey: existingClaim.candidate_key,
                playerName: existingClaim.player_name,
                playerPosition: existingClaim.player_position,
                displayName: existingClaim.display_name,
                claimedAt: existingClaim.claimed_at,
              }
            : null
        }
        storageReady={!error}
      />
    </AppLayout>
  );
}
