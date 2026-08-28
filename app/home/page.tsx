import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppLayout from "@/app/components/layout/AppLayout";
import { findTeamBySlug, NFL_TEAMS } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadSiteWeeklyHighlights } from "@/lib/site-weekly-highlights";

export const dynamic = "force-dynamic";

type SessionUser = {
  id: string;
  username: string;
  displayName: string;
};

async function session() {
  const store = await cookies();
  const value = store.get("new_era_discord_user")?.value;

  if (!value) return null;

  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as SessionUser;
  } catch {
    return null;
  }
}

export default async function OwnerHomePage() {
  const user = await session();

  if (!user) {
    redirect("/discord-connect");
  }

  const memberResult = await supabaseAdmin
    .from("members")
    .select("display_name, team")
    .eq("discord_id", user.id)
    .maybeSingle();

  const member = memberResult.data;
  const team = findTeamBySlug(member?.team ?? null);

  // Gold Jacket intentionally uses a fresh league slug so the retired
  // New Era franchise can remain archived without feeding this dashboard.
  const leagueResult = await supabaseAdmin
    .from("leagues")
    .select("id, season, current_week")
    .eq("slug", "gold-jacket-cfm")
    .maybeSingle();

  const league = leagueResult.data;
  let currentGame: any = null;
  let teamRow: any = null;

  if (team && league) {
    const teamResult = await supabaseAdmin
      .from("teams")
      .select("id, abbreviation")
      .eq("league_id", league.id)
      .eq("abbreviation", team.abbreviation)
      .maybeSingle();

    teamRow = teamResult.data;

    if (teamRow) {
      const gameResult = await supabaseAdmin
        .from("league_games")
        .select(
          "id, week, status, home_team_id, away_team_id, home_team_abbreviation, away_team_abbreviation, home_score, away_score",
        )
        .eq("league_id", league.id)
        .eq("season", league.season)
        .eq("week", league.current_week)
        .eq("game_type", "regular")
        .or(`home_team_id.eq.${teamRow.id},away_team_id.eq.${teamRow.id}`)
        .limit(1)
        .maybeSingle();

      currentGame = gameResult.data;
    }
  }

  const opponentAbbreviation =
    currentGame && teamRow
      ? currentGame.home_team_id === teamRow.id
        ? currentGame.away_team_abbreviation
        : currentGame.home_team_abbreviation
      : null;

  const opponent = opponentAbbreviation
    ? NFL_TEAMS.find((entry) => entry.abbreviation === opponentAbbreviation) ?? null
    : null;

  const week = Number(league?.current_week ?? 1);
  const highlights = await loadSiteWeeklyHighlights();
  const displayName = member?.display_name ?? user.displayName;

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#070706] text-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <section className="relative overflow-hidden rounded-[1.75rem] border border-[#d7b35a]/20 bg-[radial-gradient(circle_at_8%_0%,rgba(215,179,90,.18),transparent_24rem),linear-gradient(135deg,#11100d,#080807)] px-6 py-5 shadow-[0_28px_90px_rgba(0,0,0,.4)] sm:px-8 sm:py-6">
            <div className="pointer-events-none absolute -right-6 -top-10 text-[10rem] font-black leading-none text-[#d7b35a]/[0.035]">
              GJ
            </div>

            <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300/80">
                  Week {week} • Gold Jacket CFM
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                  Welcome back, {displayName}.
                </h1>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d7b35a]/20 bg-[#d7b35a]/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#ead89e]">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,.7)]" />
                {league ? "League connected" : "Fresh league ready to connect"}
              </div>
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <Link
              href="/my-game"
              className="group overflow-hidden rounded-[1.75rem] border border-[#d7b35a]/20 bg-[linear-gradient(135deg,rgba(215,179,90,.11),rgba(8,8,7,.97))] p-6 transition hover:-translate-y-0.5 hover:border-[#d7b35a]/40 sm:p-7"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300/80">
                  Your Matchup
                </p>
                <span className="text-zinc-600 transition group-hover:translate-x-1 group-hover:text-amber-200">→</span>
              </div>

              {team ? (
                <div className="mt-5 flex items-center gap-4 sm:gap-5">
                  <div className="relative h-16 w-16 shrink-0 rounded-2xl border border-white/10 bg-black/35 sm:h-20 sm:w-20">
                    <Image
                      src={`https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${team.abbreviation}`}
                      alt={team.name}
                      fill
                      unoptimized
                      className="object-contain p-2"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-500">
                      {team.city} {team.name}
                    </p>
                    <p className="mt-1 truncate text-2xl font-black sm:text-3xl">
                      {opponent ? `vs ${opponent.name}` : "Matchup loads after sync"}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-zinc-500">
                      {currentGame?.status ?? "Gold Jacket league not linked yet"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-lg font-bold text-zinc-300">
                  Your Discord team assignment hasn&apos;t synced yet.
                </p>
              )}

              <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.11em] text-zinc-300">
                Open matchup
              </div>
            </Link>

            <Link
              href="/gold-jackets"
              className="group relative overflow-hidden rounded-[1.75rem] border border-[#d7b35a]/30 bg-[radial-gradient(circle_at_90%_15%,rgba(244,215,132,.19),transparent_14rem),linear-gradient(145deg,#18150d,#090908_72%)] p-6 transition hover:-translate-y-0.5 hover:border-amber-300/50 sm:p-7"
            >
              <div className="pointer-events-none absolute -bottom-10 -right-8 h-36 w-36 opacity-20 sm:h-44 sm:w-44">
                <Image src="/gold-jacket-mark.png" alt="" fill sizes="176px" className="object-contain" />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                    Your Gold Jacket
                  </p>
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200">
                    Signature Player
                  </span>
                </div>

                <p className="mt-5 text-3xl font-black tracking-[-0.04em]">
                  Selection Pending
                </p>
                <p className="mt-2 text-sm font-bold text-[#e8d59b]">
                  70 OVR • Superstar • Age 20
                </p>
                <p className="mt-4 max-w-[18rem] text-sm leading-6 text-zinc-500">
                  Your franchise Hall of Famer will live here and grow with your team all season.
                </p>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.12em] text-amber-200 transition group-hover:text-amber-100">
                  View Gold Jackets →
                </p>
              </div>
            </Link>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9b8248]">
                  Around Gold Jacket
                </p>
                <h2 className="mt-1 text-2xl font-black">Happening now</h2>
              </div>
              <Link href="/media" className="text-xs font-black text-amber-300/80 transition hover:text-amber-200">
                Media →
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Link href="/gotw" className="group overflow-hidden rounded-2xl border border-amber-400/20 bg-[linear-gradient(145deg,rgba(245,158,11,.09),rgba(255,255,255,.025))] p-5 transition hover:-translate-y-0.5 hover:border-amber-300/40">
                <div className="flex items-center justify-between">
                  <span className="text-xl">🔥</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-300">GOTW</span>
                </div>
                {highlights.gotw ? (
                  <>
                    <p className="mt-4 text-lg font-black leading-tight">
                      {highlights.gotw.away.name} @ {highlights.gotw.home.name}
                    </p>
                    <p className="mt-2 text-xs font-bold text-zinc-500">
                      {highlights.gotw.away.record} vs {highlights.gotw.home.record}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-lg font-black">Game of the Week</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">The featured matchup appears after the new league connects.</p>
                  </>
                )}
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 transition group-hover:text-white">Open matchup →</p>
              </Link>

              <Link href="/potw" className="group rounded-2xl border border-[#d7b35a]/20 bg-[linear-gradient(145deg,rgba(215,179,90,.09),rgba(255,255,255,.025))] p-5 transition hover:-translate-y-0.5 hover:border-[#d7b35a]/40">
                <div className="flex items-center justify-between">
                  <span className="text-xl">🏆</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#e2c875]">POTW</span>
                </div>
                {highlights.potw ? (
                  <>
                    <p className="mt-4 text-lg font-black">Week {highlights.potw.week} Winners</p>
                    <div className="mt-3 space-y-1.5">
                      {highlights.potw.awards.slice(0, 2).map((award) => (
                        <p key={award.label} className="truncate text-xs font-bold text-zinc-400">
                          {award.playerName}{award.team ? ` • ${award.team}` : ""}
                        </p>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-lg font-black">Players of the Week</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">Weekly award winners will show up right here.</p>
                  </>
                )}
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 transition group-hover:text-white">View awards →</p>
              </Link>

              <Link href="/gold-jackets" className="group rounded-2xl border border-[#d7b35a]/25 bg-[radial-gradient(circle_at_top_right,rgba(244,215,132,.12),transparent_10rem),rgba(255,255,255,.025)] p-5 transition hover:-translate-y-0.5 hover:border-amber-300/45">
                <div className="flex items-center justify-between">
                  <span className="text-xl">🧥</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-300">Gold Jacket Watch</span>
                </div>
                <p className="mt-4 text-lg font-black">Build the next Hall of Famer</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">32 franchise legends. All start at 70 OVR, age 20, with Superstar development.</p>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 transition group-hover:text-white">See all 32 →</p>
              </Link>

              <Link href="/media/power-rankings" className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-[#d7b35a]/25 hover:bg-white/[0.05]">
                <div className="flex items-center justify-between">
                  <span className="text-xl">📈</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">Power Rankings</span>
                </div>
                <p className="mt-4 text-lg font-black">Who runs Gold Jacket?</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">The weekly board lives here once games start counting.</p>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 transition group-hover:text-white">View rankings →</p>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
