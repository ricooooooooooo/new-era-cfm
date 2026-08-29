import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "@/app/components/layout/AppLayout";
import { getGoldJacketCandidateByKey } from "@/lib/gold-jackets/catalog";
import { findTeamBySlug } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LEAGUE_KEY = process.env.GOLD_JACKET_LEAGUE_KEY || "gold-jacket-cfm";

type PlayerPageProps = {
  params: Promise<{ candidateKey: string }>;
};

type ClaimRow = {
  team_slug: string;
  display_name: string;
  claimed_at: string;
};

export default async function GoldJacketPlayerPage({ params }: PlayerPageProps) {
  const { candidateKey } = await params;
  const candidate = getGoldJacketCandidateByKey(candidateKey);
  if (!candidate) notFound();

  const { data, error } = await supabaseAdmin
    .from("gold_jacket_claims")
    .select("team_slug, display_name, claimed_at")
    .eq("league_key", LEAGUE_KEY)
    .eq("candidate_key", candidate.key)
    .maybeSingle();

  if (error) {
    console.error(`Unable to load ${candidate.name} Gold Jacket claim:`, error);
  }

  const claim = (data ?? null) as ClaimRow | null;
  const team = findTeamBySlug(claim?.team_slug ?? null);
  const primary = team?.primary ?? "#d4af37";
  const secondary = team?.secondary ?? "#f4e3a1";
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(candidate.wikipediaTitle.replaceAll(" ", "_"))}`;

  return (
    <AppLayout>
      <main className="min-h-[calc(100vh-8rem)] bg-[#050505] text-white">
        <section className="relative overflow-hidden border-b border-white/10 bg-black">
          <div
            className="absolute inset-0 opacity-65"
            style={{
              background: `radial-gradient(circle at 15% 20%, ${primary}99, transparent 34rem), radial-gradient(circle at 88% 10%, ${secondary}55, transparent 28rem)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-[#050505]" />
          <div className="relative mx-auto max-w-7xl px-6 pb-12 pt-8 sm:px-8 sm:pb-16">
            <Link href={team ? `/gold-jackets/${team.slug}` : "/gold-jackets"} className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 transition hover:text-white">
              ← {team ? `${team.name} Gold Jacket Room` : "Gold Jacket Hall"}
            </Link>

            <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr_auto] lg:items-end">
              <div className="aspect-[4/5] overflow-hidden rounded-[2rem] border border-amber-300/20 bg-black shadow-[0_20px_70px_rgba(0,0,0,0.5)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/gold-jackets/photo/${candidate.key}${team ? `?team=${encodeURIComponent(team.slug)}` : ""}`} alt={candidate.name} className="h-full w-full object-cover object-top" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.34em] text-amber-300">Gold Jacket Player Profile</p>
                <h1 className="mt-3 text-5xl font-black tracking-[-0.065em] sm:text-7xl">{candidate.name}</h1>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em]">{candidate.position}</span>
                  <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-amber-100">Pro Football Hall of Fame{candidate.hofClass ? ` • Class of ${candidate.hofClass}` : ""}</span>
                  <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-amber-100">Superstar</span>
                </div>
                <p className="mt-5 text-lg font-bold text-zinc-300">
                  {team ? `${team.city} ${team.name} Gold Jacket` : "Currently unclaimed"}
                </p>
                {claim && <p className="mt-2 text-sm text-zinc-500">Inducted by {claim.display_name}</p>}
              </div>
              <div className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.065] px-7 py-5 text-center backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200/70">Starting Overall</p>
                <p className="mt-1 text-6xl font-black tracking-[-0.08em]">70</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[["Age", "20"], ["Overall", "70"], ["Development", "Superstar"], ["Status", team ? "Inducted" : "Available"]].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">{label}</p>
                <p className="mt-3 text-2xl font-black">{value}</p>
              </article>
            ))}
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">NFL Legacy</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">A real Canton legend.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
                Every selectable Gold Jacket is a real enshrined Pro Football Hall of Fame player. Gold Jacket CFM revives that historical identity as a 20-year-old development player instead of copying the legend&apos;s prime Madden rating.
              </p>
              <a href={wikiUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-200 transition hover:border-amber-300/30 hover:bg-amber-300/[0.06] hover:text-white">
                View Historical Player Source ↗
              </a>
              <p className="mt-4 text-[10px] text-zinc-600">Official playing-era roster/profile headshot.</p>
            </section>

            <aside className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.055] p-6 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-200">Gold Jacket Career</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">Built to grow.</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-400">
                The permanent identity is locked here. Once Madden league sync is connected to Gold Jacket CFM, this profile can append live season stats, progression, awards, records and career milestones without changing the induction record.
              </p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Permanent Build</p>
                <p className="mt-2 font-black text-white">Age 20 • 70 OVR • Superstar</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
