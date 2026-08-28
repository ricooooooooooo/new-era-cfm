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

type TeamPageProps = {
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
    console.error("Unable to load New Era league ID:", error);
    return null;
  }

  return data?.id ?? null;
}

export default async function TeamPage({ params }: TeamPageProps) {
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
  const topPlayers = players.slice(0, 8);
  const teamLogo = `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${team.abbreviation}`;

  return (
    <AppLayout>
      <main className="min-h-[calc(100vh-8rem)] bg-[#050606] text-white">
        <section className="relative overflow-hidden border-b border-white/10 bg-black">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background: `radial-gradient(circle at 15% 10%, ${team.primary}88, transparent 34rem), radial-gradient(circle at 90% 20%, ${team.secondary}55, transparent 28rem)`,
            }}
          />

          <div className="relative mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:py-16">
            <div>
              <Link
                href="/teams"
                className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500 transition hover:text-white"
              >
                ← All Teams
              </Link>

              <p
                className="mt-8 text-xs font-black uppercase tracking-[0.3em]"
                style={{ color: team.secondary }}
              >
                New Era Franchise Headquarters
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-[-0.065em] sm:text-7xl">
                {team.city} {team.name}
              </h1>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black uppercase tracking-[0.15em] text-zinc-200">
                  {players.length} Players
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black uppercase tracking-[0.15em] text-zinc-200">
                  {hasFranchiseData ? "EA Franchise Data" : "M27 Launch Baseline"}
                </span>
              </div>
            </div>

            <div
              className="relative h-36 w-36 overflow-hidden rounded-[2rem] border border-white/15 bg-black/35 sm:h-44 sm:w-44"
              style={{ boxShadow: `0 28px 80px ${team.primary}55` }}
            >
              <Image
                src={teamLogo}
                alt={`${team.city} ${team.name}`}
                fill
                unoptimized
                className="object-contain p-6"
              />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 sm:py-10">
          <nav className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Roster", `/teams/${team.slug}/roster`, "Players, ratings and positions"],
              ["Schedule", `/teams/${team.slug}/schedule`, "Games and results"],
              ["Stats", `/teams/${team.slug}/stats`, "Team and player production"],
              ["Depth Chart", `/teams/${team.slug}/depth-chart`, "Starters and backups"],
            ].map(([label, href, description]) => (
              <Link
                key={label}
                href={href}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"
              >
                <p className="font-black">{label}</p>
                <p className="mt-2 text-sm text-zinc-500">{description}</p>
              </Link>
            ))}
          </nav>

          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                  Franchise Roster
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Top Players
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  {hasFranchiseData
                    ? "Current New Era franchise values with baseline fallback."
                    : "Madden 27 launch ratings. EA franchise values will replace these automatically after sync."}
                </p>
              </div>

              <Link
                href={`/teams/${team.slug}/roster`}
                className="w-fit rounded-xl px-4 py-2.5 text-sm font-black text-white"
                style={{ background: `linear-gradient(135deg, ${team.primary}, ${team.secondary})` }}
              >
                View Full Roster →
              </Link>
            </div>

            {rosterError || players.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-6">
                <p className="font-black text-amber-200">Roster data could not be loaded.</p>
                <p className="mt-2 text-sm text-zinc-400">
                  Run the Madden baseline verifier from Terminal and check the reported database counts.
                </p>
              </div>
            ) : (
              <div className="mt-6">
                <MaddenRosterTable players={topPlayers} compact />
              </div>
            )}
          </section>

          <section className="mt-6 rounded-3xl border border-purple-400/20 bg-purple-400/[0.055] p-6">
            <p className="text-sm font-black text-purple-200">Data source ready</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">
              The roster is active now from the launch baseline. Completed-game stats, progression, regression,
              transactions and updated ratings will appear from the EA franchise source as soon as that connection is enabled.
            </p>
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
