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

  if (!user) redirect("/discord-connect");

  const memberResult = await supabaseAdmin
    .from("members")
    .select("display_name, team")
    .eq("discord_id", user.id)
    .maybeSingle();

  const member = memberResult.data;
  const team = findTeamBySlug(member?.team ?? null);

  const leagueResult = await supabaseAdmin
    .from("leagues")
    .select("id, season, current_week")
    .eq("slug", "new-era-cfm")
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
        .or(
          `home_team_id.eq.${teamRow.id},away_team_id.eq.${teamRow.id}`,
        )
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
    ? NFL_TEAMS.find(
        (entry) => entry.abbreviation === opponentAbbreviation,
      ) ?? null
    : null;

  const week = Number(league?.current_week ?? 1);
  const highlights = await loadSiteWeeklyHighlights();

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#050505] text-[#f7f2e7]">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <section className="relative overflow-hidden rounded-[1.65rem] border border-[#d7b56d]/15 bg-[radial-gradient(circle_at_8%_0%,rgba(214,177,90,.16),transparent_22rem),linear-gradient(135deg,#12110e,#080909)] px-6 py-5 shadow-[0_22px_70px_rgba(0,0,0,.35)] sm:px-7 sm:py-6">
            <div className="pointer-events-none absolute -right-5 -top-10 text-[9rem] font-black leading-none text-[#f2d490]/[0.035]">
              GJ
            </div>

            <div className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d7b56d]">
                  Week {week} • Gold Jacket
                </p>
                <h1 className="mt-1.5 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                  Welcome back, {member?.display_name ?? user.displayName}.
                </h1>
              </div>

              <div className="w-fit rounded-full border border-[#d7b56d]/20 bg-[#d7b56d]/[0.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#e7c87f]">
                48 Hour Advance
              </div>
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            <Link
              href="/my-game"
              className="group relative min-h-[245px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.055),rgba(7,7,7,.98))] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-[#d7b56d]/30 sm:p-7"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d7b56d]">
                  Your Matchup
                </p>
                <span className="text-zinc-600 transition group-hover:translate-x-1 group-hover:text-[#e7c87f]">
                  →
                </span>
              </div>

              {team ? (
                <div className="mt-6">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 rounded-2xl border border-white/10 bg-black/35">
                      <Image
                        src={`https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${team.abbreviation}`}
                        alt={team.name}
                        fill
                        unoptimized
                        className="object-contain p-2"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                        {team.city} {team.name}
                      </p>
                      <p className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                        {opponent ? `vs ${opponent.name}` : "Matchup loading"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-300">
                      Week {week}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-300">
                      {currentGame?.status ?? "Scheduled"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-6 max-w-md text-lg font-bold text-zinc-300">
                  Your team assignment is still syncing.
                </p>
              )}

              <p className="absolute bottom-6 left-6 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500 transition group-hover:text-white sm:left-7">
                View matchup →
              </p>
            </Link>

            <Link
              href="/gold-jackets"
              className="group relative min-h-[245px] overflow-hidden rounded-[1.75rem] border border-[#d7b56d]/25 bg-[#0a0907] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-[#e6c675]/50 sm:p-7"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, rgba(5,5,4,.99) 0%, rgba(7,6,5,.94) 38%, rgba(8,7,5,.72) 58%, rgba(8,7,5,.20) 100%), url("/gold-jacket-legends-bg.png")',
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover, 60% auto",
                backgroundPosition: "center, right center",
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_24%,rgba(233,193,104,.16),transparent_18rem)]" />

              <div className="relative z-10 max-w-[64%]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧥</span>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#e1bf70]">
                    Your Gold Jacket
                  </p>
                </div>

                <h2 className="mt-6 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                  Selection Pending
                </h2>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#d7b56d]">
                  70 OVR • Superstar • Age 20
                </p>
                <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-400">
                  One franchise legend. Reborn at 20. Build the career from scratch.
                </p>
              </div>

              <p className="absolute bottom-6 left-6 z-10 text-[10px] font-black uppercase tracking-[0.14em] text-[#e1bf70] transition group-hover:translate-x-1 sm:left-7">
                View Gold Jackets →
              </p>
            </Link>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f7744]">
                  Around Gold Jacket
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">
                  Happening now
                </h2>
              </div>

              <Link
                href="/league"
                className="text-[10px] font-black uppercase tracking-[0.12em] text-[#d7b56d] transition hover:text-[#f0d38f]"
              >
                League →
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Link
                href="/media/game-of-the-week"
                className="group min-h-[180px] rounded-2xl border border-[#d7b56d]/20 bg-[linear-gradient(145deg,rgba(214,177,90,.10),rgba(255,255,255,.025))] p-5 transition hover:border-[#e7c87f]/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">🔥</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#d7b56d]">
                    GOTW
                  </span>
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
                    <p className="mt-4 text-lg font-black">Week {week} GOTW</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Matchup selection is loading.
                    </p>
                  </>
                )}

                <p className="mt-5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500 transition group-hover:text-white">
                  Open matchup →
                </p>
              </Link>

              <Link
                href="/media/awards"
                className="group min-h-[180px] rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#d7b56d]/25"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">🏆</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#d7b56d]">
                    POTW
                  </span>
                </div>

                {highlights.potw ? (
                  <>
                    <p className="mt-4 text-lg font-black">
                      Week {highlights.potw.week} Winners
                    </p>
                    <div className="mt-3 space-y-1.5">
                      {highlights.potw.awards.slice(0, 2).map((award) => (
                        <p
                          key={award.label}
                          className="truncate text-xs font-bold text-zinc-400"
                        >
                          {award.playerName}
                          {award.team ? ` • ${award.team}` : ""}
                        </p>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-lg font-black">Players of the Week</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Awards will populate automatically.
                    </p>
                  </>
                )}

                <p className="mt-5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500 transition group-hover:text-white">
                  View awards →
                </p>
              </Link>

              <Link
                href="/gold-jackets"
                className="group min-h-[180px] rounded-2xl border border-[#d7b56d]/20 bg-[linear-gradient(145deg,rgba(214,177,90,.07),rgba(255,255,255,.025))] p-5 transition hover:border-[#e7c87f]/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">🧥</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#d7b56d]">
                    Jacket Watch
                  </span>
                </div>

                <p className="mt-4 text-lg font-black">The Legends Return</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Every franchise gets one retired great at 70 OVR, Superstar dev and age 20.
                </p>
                <p className="mt-5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500 transition group-hover:text-white">
                  View all 32 →
                </p>
              </Link>

              <Link
                href="/media/power-rankings"
                className="group min-h-[180px] rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#d7b56d]/25"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">📈</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    Rankings
                  </span>
                </div>
                <p className="mt-4 text-lg font-black">Power Rankings</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  See who is climbing, falling and setting the pace this week.
                </p>
                <p className="mt-5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500 transition group-hover:text-white">
                  View rankings →
                </p>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
