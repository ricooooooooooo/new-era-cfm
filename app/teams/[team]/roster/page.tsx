import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "@/app/components/layout/AppLayout";
import MaddenRosterTable from "@/app/components/teams/MaddenRosterTable";
import { getCurrentMaddenPlayers } from "@/lib/madden/player-data";
import type { CurrentMaddenPlayer } from "@/lib/madden/types";
import { findTeamBySlug } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RosterPageProps = {
  params: Promise<{
    team: string;
  }>;
};

async function getNewEraLeagueId(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("leagues")
    .select("id")
    .eq("slug", "gold-jacket-cfm")
    .maybeSingle();

  if (error) {
    console.error("Unable to load Gold Jacket league ID:", error);
    return null;
  }

  return data?.id ?? null;
}

export default async function RosterPage({ params }: RosterPageProps) {
  const { team: teamSlug } = await params;
  const team = findTeamBySlug(teamSlug);

  if (!team) notFound();

  const leagueId = await getNewEraLeagueId();

  let players: CurrentMaddenPlayer[] = [];
  let rosterError = false;

  try {
    players = await getCurrentMaddenPlayers({
      leagueId,
      teamAbbreviation: team.abbreviation,
      limit: 100,
    });
  } catch (error) {
    rosterError = true;
    console.error(`Unable to load ${team.slug} roster:`, error);
  }

  const hasFranchiseData = players.some((player) => player.hasFranchiseData);
  const ratedPlayers = players.filter((player) => player.overall !== null);
  const averageOverall = ratedPlayers.length
    ? Math.round(
        ratedPlayers.reduce((total, player) => total + (player.overall ?? 0), 0) /
          ratedPlayers.length,
      )
    : null;
  const highestOverall = ratedPlayers[0]?.overall ?? null;
  const teamLogo = `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${team.abbreviation}`;

  return (
    <AppLayout>
      <main className="min-h-[calc(100vh-8rem)] bg-[#050606] text-white">
        <section className="relative overflow-hidden border-b border-white/10 bg-black">
          <div
            className="absolute inset-0 opacity-55"
            style={{
              background: `radial-gradient(circle at 12% 8%, ${team.primary}88, transparent 32rem), radial-gradient(circle at 86% 18%, ${team.secondary}55, transparent 26rem)`,
            }}
          />

          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-12">
            <div>
              <Link
                href={`/teams/${team.slug}`}
                className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500 transition hover:text-white"
              >
                ← Franchise HQ
              </Link>

              <p
                className="mt-7 text-xs font-black uppercase tracking-[0.3em]"
                style={{ color: team.secondary }}
              >
                Gold Jacket Roster Center
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                {team.city} {team.name}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                  Active Source
                </p>
                <p className="mt-1 font-black">
                  {hasFranchiseData ? "EA Franchise + Baseline" : "M27 Launch Baseline"}
                </p>
              </div>
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/15 bg-black/35">
                <Image
                  src={teamLogo}
                  alt={`${team.city} ${team.name}`}
                  fill
                  unoptimized
                  className="object-contain p-3"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 sm:py-10">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Roster Size", players.length || "—"],
              ["Average OVR", averageOverall ?? "—"],
              ["Highest OVR", highestOverall ?? "—"],
              ["Franchise Synced", hasFranchiseData ? "Yes" : "Not Yet"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                  {label}
                </p>
                <p className="mt-3 text-3xl font-black">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-6">
            <div className="px-2 pb-5">
              <h2 className="text-2xl font-black tracking-[-0.035em]">Full Roster</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Ratings are sorted highest to lowest. EA values will override the baseline automatically after future league syncs.
              </p>
            </div>

            {rosterError || players.length === 0 ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-6">
                <p className="font-black text-amber-200">No roster records were returned.</p>
                <p className="mt-2 text-sm text-zinc-400">
                  The import may be in Supabase but the site page was previously still connected to the old placeholder. Run the verifier and use its counts to confirm the baseline tables.
                </p>
              </div>
            ) : (
              <MaddenRosterTable players={players} />
            )}
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
