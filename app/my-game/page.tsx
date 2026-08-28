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
};

async function getUser() {
  const store =
    await cookies();

  const value =
    store.get(
      "gold_jacket_discord_user",
    )?.value;

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(
        value,
        "base64url",
      ).toString("utf8"),
    ) as SessionUser;
  } catch {
    return null;
  }
}

export default async function MyGamePage() {
  const user =
    await getUser();

  if (!user) {
    redirect(
      "/discord-connect",
    );
  }

  const memberResult =
    await supabaseAdmin
      .from("members")
      .select(
        "team",
      )
      .eq(
        "discord_id",
        user.id,
      )
      .maybeSingle();

  const team =
    findTeamBySlug(
      memberResult.data
        ?.team ??
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
        "gold-jacket-cfm",
      )
      .maybeSingle();

  const league =
    leagueResult.data;

  let game:
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

      game =
        gameResult.data;
    }
  }

  const opponentAbbr =
    game &&
    teamRow
      ? (
          game.home_team_id ===
          teamRow.id
            ? game.away_team_abbreviation
            : game.home_team_abbreviation
        )
      : null;

  const opponent =
    opponentAbbr
      ? NFL_TEAMS.find(
          (item) =>
            item.abbreviation ===
            opponentAbbr,
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
      <div className="min-h-screen bg-[#050606] px-4 py-6 text-white sm:px-6 sm:py-9">
        <div className="mx-auto max-w-5xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">
              Week {week}
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              My Game
            </h1>

            <p className="mt-3 text-sm text-zinc-500">
              Everything for your matchup in one place.
            </p>
          </div>

          {team ? (
            <section className="mt-7 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(126,34,206,.16),transparent_65%),#090a0c] p-6 sm:p-10">
              <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto_1fr]">
                <div className="text-center">
                  <div className="relative mx-auto h-28 w-28 sm:h-36 sm:w-36">
                    <Image
                      src={`https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${team.abbreviation}`}
                      alt={team.name}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>

                  <p className="mt-3 text-xl font-black">
                    {team.name}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                    Gold Jacket
                  </p>

                  <p className="mt-1 text-4xl font-black italic">
                    VS
                  </p>
                </div>

                <div className="text-center">
                  {opponent ? (
                    <>
                      <div className="relative mx-auto h-28 w-28 sm:h-36 sm:w-36">
                        <Image
                          src={`https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${opponent.abbreviation}`}
                          alt={opponent.name}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      </div>

                      <p className="mt-3 text-xl font-black">
                        {opponent.name}
                      </p>
                    </>
                  ) : (
                    <div className="flex h-36 items-center justify-center text-zinc-600">
                      Opponent loading
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Link
                  href="/schedule"
                  className="flex min-h-14 items-center justify-center rounded-2xl bg-amber-600 px-4 text-center text-sm font-black transition hover:bg-amber-500"
                >
                  Schedule Game
                </Link>

                <Link
                  href="/predictions"
                  className="flex min-h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-center text-sm font-black transition hover:bg-white/[0.09]"
                >
                  Matchup Odds
                </Link>

                <Link
                  href="/era#scout"
                  className="flex min-h-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 text-center text-sm font-black transition hover:bg-red-400/[0.10]"
                >
                  🕵️ Scout Report
                </Link>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
                      Madden Status
                    </p>

                    <p className="mt-1 font-black capitalize">
                      {game?.status ??
                        "Scheduled"}
                    </p>
                  </div>

                  {game?.status ===
                  "final" ? (
                    <p className="text-2xl font-black">
                      {game.away_score} -{" "}
                      {game.home_score}
                    </p>
                  ) : (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">
                      Week {week}
                    </span>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <p className="text-xl font-black">
                No team linked yet.
              </p>

              <p className="mt-2 text-zinc-500">
                Once your Discord team assignment syncs, your matchup will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
