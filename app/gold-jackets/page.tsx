import Link from "next/link";
import AppLayout from "@/app/components/layout/AppLayout";
import { getGoldJacketCandidateByKey } from "@/lib/gold-jackets/catalog";
import { NFL_TEAMS } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LEAGUE_KEY = process.env.GOLD_JACKET_LEAGUE_KEY || "gold-jacket-cfm";

type ClaimRow = {
  id: string;
  team_slug: string;
  candidate_key: string;
  player_name: string;
  player_position: string;
  display_name: string;
  claimed_at: string;
};

async function loadClaims() {
  const { data, error } = await supabaseAdmin
    .from("gold_jacket_claims")
    .select(
      "id, team_slug, candidate_key, player_name, player_position, display_name, claimed_at",
    )
    .eq("league_key", LEAGUE_KEY)
    .order("claimed_at", { ascending: true });

  if (error) {
    console.error("Unable to load Gold Jacket Hall:", error);
    return { claims: [] as ClaimRow[], storageReady: false };
  }

  return { claims: (data ?? []) as ClaimRow[], storageReady: true };
}

export default async function GoldJacketsPage() {
  const { claims, storageReady } = await loadClaims();
  const claimByTeam = new Map(claims.map((claim) => [claim.team_slug, claim]));

  return (
    <AppLayout>
      <main className="min-h-[calc(100vh-8rem)] bg-[#050505] text-white">
        <section className="relative overflow-hidden border-b border-amber-300/15 bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.19),transparent_38rem),radial-gradient(circle_at_78%_20%,rgba(255,239,178,0.08),transparent_30rem)]" />
          <div className="relative mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16">
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-amber-300">
              Gold Jacket CFM
            </p>
            <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <h1 className="text-5xl font-black tracking-[-0.065em] sm:text-7xl">
                  THE GOLD JACKET HALL
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400 sm:text-lg">
                  One franchise. One Hall of Famer. One permanent decision. Shared legends are first come, first served across the entire league.
                </p>
              </div>
              <div className="grid min-w-[260px] grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Inducted</p>
                  <p className="mt-2 text-3xl font-black text-amber-300">{claims.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Remaining</p>
                  <p className="mt-2 text-3xl font-black">{Math.max(0, NFL_TEAMS.length - claims.length)}</p>
                </div>
              </div>
            </div>

            {!storageReady && (
              <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] px-5 py-4 text-sm text-amber-100">
                Gold Jacket claim storage has not been migrated yet. The Hall is in preview mode until the Supabase migration is applied.
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {NFL_TEAMS.map((team) => {
              const claim = claimByTeam.get(team.slug) ?? null;
              const selected = claim
                ? getGoldJacketCandidateByKey(claim.candidate_key)
                : null;
              const logo = `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${team.abbreviation}`;

              return (
                <Link
                  key={team.slug}
                  href={`/gold-jackets/${team.slug}`}
                  className="group relative min-h-[245px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0b] p-5 transition duration-300 hover:-translate-y-1 hover:border-amber-300/35 hover:shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                >
                  <div
                    className="absolute inset-0 opacity-40 transition duration-300 group-hover:opacity-60"
                    style={{
                      background: `radial-gradient(circle at 85% 0%, ${team.primary}88, transparent 18rem), radial-gradient(circle at 0% 100%, ${team.secondary}55, transparent 18rem)`,
                    }}
                  />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">
                          {claim ? "Inducted" : "Selection Open"}
                        </p>
                        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
                          {team.city}
                          <span className="block">{team.name}</span>
                        </h2>
                      </div>
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logo} alt="" className="h-full w-full object-contain" />
                      </div>
                    </div>

                    <div className="mt-auto pt-8">
                      {claim ? (
                        <>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                            Gold Jacket
                          </p>
                          <p className="mt-1 text-xl font-black text-white">
                            {selected?.name ?? claim.player_name}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Selected by {claim.display_name}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-black text-zinc-200">Choose the legend.</p>
                          <p className="mt-1 text-xs text-zinc-500">Permanent once inducted.</p>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
