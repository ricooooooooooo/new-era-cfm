import Image from "next/image";
import Link from "next/link";
import {
  cookies,
} from "next/headers";
import {
  redirect,
} from "next/navigation";

import AppLayout from "@/app/components/layout/AppLayout";
import {
  findTeamBySlug,
  NFL_TEAMS,
} from "@/lib/nfl-teams";
import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

type SessionUser = {
  id: string;
  username: string;
  displayName: string;
};

async function session() {
  const store =
    await cookies();

  const value =
    store.get(
      "new_era_discord_user",
    )?.value;

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(
        value,
        "base64url",
      ).toString(
        "utf8",
      ),
    ) as SessionUser;
  } catch {
    return null;
  }
}

export default async function OwnerHomePage() {
  const user =
    await session();

  if (!user) {
    redirect(
      "/discord-connect",
    );
  }

  const memberResult =
    await supabaseAdmin
      .from("members")
      .select(
        "display_name, team",
      )
      .eq(
        "discord_id",
        user.id,
      )
      .maybeSingle();

  const member =
    memberResult.data;

  const team =
    findTeamBySlug(
      member?.team ??
        null,
    );

  const leagueResult =
    await supabaseAdmin
      .from("leagues")
      .select(
        "id, season, current_week",
      )
      .eq(
        "slug",
        "new-era-cfm",
      )
      .maybeSingle();

  const league =
    leagueResult.data;

  let currentGame:
    any = null;

  let teamRow:
    any = null;

  if (
    team &&
    league
  ) {
    const teamResult =
      await supabaseAdmin
        .from("teams")
        .select(
          "id, abbreviation",
        )
        .eq(
          "league_id",
          league.id,
        )
        .eq(
          "abbreviation",
          team.abbreviation,
        )
        .maybeSingle();

    teamRow =
      teamResult.data;

    if (teamRow) {
      const gameResult =
        await supabaseAdmin
          .from(
            "league_games",
          )
          .select(
            "id, week, status, home_team_id, away_team_id, home_team_abbreviation, away_team_abbreviation, home_score, away_score",
          )
          .eq(
            "league_id",
            league.id,
          )
          .eq(
            "season",
            league.season,
          )
          .eq(
            "week",
            league.current_week,
          )
          .eq(
            "game_type",
            "regular",
          )
          .or(
            `home_team_id.eq.${teamRow.id},away_team_id.eq.${teamRow.id}`,
          )
          .limit(1)
          .maybeSingle();

      currentGame =
        gameResult.data;
    }
  }

  const walletResult =
    await supabaseAdmin
      .from("wallets")
      .select(
        "balance",
      )
      .eq(
        "discord_id",
        user.id,
      )
      .maybeSingle();

  const balance =
    Number(
      walletResult.data
        ?.balance ??
        0,
    );

  const opponentAbbreviation =
    currentGame &&
    teamRow
      ? (
          currentGame
            .home_team_id ===
          teamRow.id
            ? currentGame
                .away_team_abbreviation
            : currentGame
                .home_team_abbreviation
        )
      : null;

  const opponent =
    opponentAbbreviation
      ? NFL_TEAMS.find(
          (entry) =>
            entry.abbreviation ===
            opponentAbbreviation,
        ) ??
        null
      : null;

  const week =
    Number(
      league
        ?.current_week ??
        1,
    );

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#050606] text-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(124,58,237,.3),transparent_25rem),linear-gradient(135deg,#111017,#08090b)] p-6 shadow-[0_30px_90px_rgba(0,0,0,.4)] sm:p-8">
            <div className="pointer-events-none absolute -right-8 -top-12 text-[12rem] font-black leading-none text-white/[0.025]">
              8
            </div>

            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-300">
                Week {week} • New Era
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-5xl">
                Welcome back,{" "}
                {member?.display_name ??
                  user.displayName}.
              </h1>

              <p className="mt-3 text-sm text-zinc-400">
                Here&apos;s everything that actually matters to you right now.
              </p>
            </div>
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
            <Link
              href="/my-game"
              className="group overflow-hidden rounded-[1.75rem] border border-purple-400/20 bg-[linear-gradient(135deg,rgba(126,34,206,.18),rgba(8,8,10,.96))] p-6 transition hover:border-purple-400/40 sm:p-7"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">
                  Your Week {week} Game
                </p>

                <span className="text-zinc-600 transition group-hover:translate-x-1 group-hover:text-white">
                  →
                </span>
              </div>

              {team ? (
                <>
                  <div className="mt-5 flex items-center gap-5">
                    <div className="relative h-16 w-16 shrink-0 rounded-2xl border border-white/10 bg-black/35">
                      <Image
                        src={`https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${team.abbreviation}`}
                        alt={team.name}
                        fill
                        unoptimized
                        className="object-contain p-2"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-zinc-500">
                        {team.city}{" "}
                        {team.name}
                      </p>

                      <p className="mt-1 text-3xl font-black">
                        {opponent
                          ? `vs ${opponent.name}`
                          : "Matchup loading"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
                      {currentGame?.status ??
                        "scheduled"}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
                      Open My Game
                    </span>
                  </div>
                </>
              ) : (
                <p className="mt-5 text-lg font-bold text-zinc-300">
                  Your Discord team assignment hasn&apos;t synced yet.
                </p>
              )}
            </Link>

            <Link
              href="/predictions"
              className="rounded-[1.75rem] border border-amber-400/15 bg-[linear-gradient(145deg,rgba(245,158,11,.11),rgba(8,8,10,.96))] p-6 transition hover:border-amber-300/30"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                NE Coin
              </p>

              <p className="mt-4 text-4xl font-black">
                {balance.toLocaleString()}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Available balance
              </p>

              <div className="mt-7 rounded-xl bg-white px-4 py-3 text-center text-xs font-black uppercase tracking-[0.1em] text-black">
                Place a Bet
              </div>
            </Link>
          </section>

          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">
                  Around New Era
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  What&apos;s happening
                </h2>
              </div>

              <Link
                href="/league"
                className="text-xs font-black text-purple-300"
              >
                League →
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Link
                href="/media/game-of-the-week"
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.055]"
              >
                <span className="text-xl">
                  🔥
                </span>

                <p className="mt-3 font-black">
                  Week {week} GOTW
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  See this week&apos;s featured matchup and league voting.
                </p>
              </Link>

              <Link
                href="/media/awards"
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.055]"
              >
                <span className="text-xl">
                  🏆
                </span>

                <p className="mt-3 font-black">
                  Week {Math.max(
                    1,
                    week - 1,
                  )} POTW
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Check the latest AFC and NFC award winners.
                </p>
              </Link>

              <Link
                href="/standings"
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.055]"
              >
                <span className="text-xl">
                  📈
                </span>

                <p className="mt-3 font-black">
                  Playoff Race
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Check standings, records and who&apos;s moving.
                </p>
              </Link>
            </div>
          </section>

          <section className="mt-7">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">
              Quick Actions
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [
                  "Schedule",
                  "/schedule",
                ],
                [
                  "Team HQ",
                  team
                    ? `/teams/${team.slug}`
                    : "/teams",
                ],
                [
                  "Market",
                  "/market",
                ],
                [
                  "Standings",
                  "/standings",
                ],
              ].map(
                ([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex min-h-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-center text-sm font-black transition active:scale-[.98] hover:bg-white/[0.055]"
                  >
                    {label}
                  </Link>
                ),
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
