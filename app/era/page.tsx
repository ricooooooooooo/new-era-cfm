import Link from "next/link";
import {
  cookies,
} from "next/headers";
import {
  redirect,
} from "next/navigation";

import AppLayout from "@/app/components/layout/AppLayout";
import {
  buildNewEraIntelligence,
} from "@/lib/new-era/intelligence";

export const dynamic =
  "force-dynamic";

type User = {
  id: string;
};

async function user() {
  const store =
    await cookies();

  const raw =
    store.get(
      "new_era_discord_user",
    )?.value;

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(
        raw,
        "base64url",
      ).toString(
        "utf8",
      ),
    ) as User;
  } catch {
    return null;
  }
}

function meter(
  value: number,
) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-white"
        style={{
          width:
            `${Math.max(
              2,
              Math.min(
                100,
                value,
              ),
            )}%`,
        }}
      />
    </div>
  );
}

export default async function EraPage() {
  const session =
    await user();

  if (!session) {
    redirect(
      "/discord-connect",
    );
  }

  const data =
    await buildNewEraIntelligence(
      session.id,
    );

  const profile =
    data.myProfile;

  return (
    <AppLayout>
      <main className="min-h-screen bg-[#050506] text-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-purple-400/20 bg-[radial-gradient(circle_at_10%_0%,rgba(126,34,206,.34),transparent_30rem),radial-gradient(circle_at_90%_0%,rgba(245,158,11,.13),transparent_28rem),#09090c] p-6 sm:p-9">
            <div className="pointer-events-none absolute -right-7 -top-20 text-[16rem] font-black leading-none text-white/[0.025]">
              8
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
              Gold Jacket Intelligence
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
              The league knows.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
              Live owner DNA, matchup intelligence, rivalry history,
              fraud detection, belt lineage and league storylines generated
              from Gold Jacket Madden data.
            </p>
          </section>

          {profile ? (
            <section
              id="dna"
              className="mt-5 grid gap-4 lg:grid-cols-[.78fr_1.22fr]"
            >
              <article className="rounded-[1.75rem] border border-purple-400/20 bg-[linear-gradient(145deg,rgba(126,34,206,.15),#090a0c)] p-6">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-300">
                  Owner DNA
                </p>

                <div className="mt-5 flex items-end justify-between gap-5">
                  <div>
                    <p className="text-6xl font-black tracking-[-0.07em]">
                      {profile.dna.overall}
                    </p>

                    <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-zinc-600">
                      Owner OVR
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                      Archetype
                    </p>

                    <p className="mt-1 text-lg font-black text-purple-200">
                      {profile.dna.archetype}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  {[
                    [
                      "Offense",
                      profile.dna.offense,
                    ],
                    [
                      "Defense",
                      profile.dna.defense,
                    ],
                    [
                      "Clutch",
                      profile.dna.clutch,
                    ],
                    [
                      "Dominance",
                      profile.dna.dominance,
                    ],
                  ].map(
                    ([
                      label,
                      value,
                    ]) => (
                      <div
                        key={
                          String(
                            label,
                          )
                        }
                      >
                        <div className="flex justify-between text-xs font-black">
                          <span className="text-zinc-500">
                            {label}
                          </span>

                          <span>
                            {value}
                          </span>
                        </div>

                        {meter(
                          Number(
                            value,
                          ),
                        )}
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
                    Team Identity
                  </p>

                  <p className="mt-2 text-lg font-black">
                    {profile.personality.name}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {profile.personality.description}
                  </p>
                </div>
              </article>

              <article
                id="wrapped"
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">
                  Your Gold Jacket Wrapped
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    [
                      "Record",
                      data.wrapped?.record ??
                        "—",
                    ],
                    [
                      "Current Streak",
                      data.wrapped?.streak ??
                        "—",
                    ],
                    [
                      "PPG",
                      data.wrapped?.avgPoints ??
                        "—",
                    ],
                    [
                      "Point Diff",
                      data.wrapped?.pointDiff ??
                        "—",
                    ],
                  ].map(
                    ([
                      label,
                      value,
                    ]) => (
                      <div
                        key={
                          String(
                            label,
                          )
                        }
                        className="rounded-2xl border border-white/10 bg-black/25 p-4"
                      >
                        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-600">
                          {label}
                        </p>

                        <p className="mt-2 text-2xl font-black">
                          {value}
                        </p>
                      </div>
                    ),
                  )}
                </div>

                {data.wrapped?.latest ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                      Last Game
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {data.wrapped.latest.result}
                      {" "}
                      {data.wrapped.latest.pf}
                      -
                      {data.wrapped.latest.pa}
                      {" vs "}
                      {data.wrapped.latest.opponent}
                    </p>
                  </div>
                ) : null}
              </article>
            </section>
          ) : (
            <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <p className="font-black">
                Your franchise is not linked yet.
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                League-wide Intelligence is still available below.
              </p>
            </section>
          )}

          <section
            id="scout"
            className="mt-5"
          >
            <div className="mb-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-300">
                Pregame Intelligence
              </p>

              <h2 className="mt-1 text-3xl font-black">
                Opponent Scout
              </h2>
            </div>

            {data.opponent ? (
              <article className="rounded-[1.75rem] border border-red-400/20 bg-[linear-gradient(145deg,rgba(239,68,68,.09),#090a0c)] p-6">
                <div className="grid gap-7 lg:grid-cols-[1fr_1.25fr]">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
                      Threat Level
                    </p>

                    <p className="mt-2 text-3xl font-black">
                      {data.opponent.threat}
                    </p>

                    <h3 className="mt-5 text-2xl font-black">
                      {data.opponent.team.city}
                      {" "}
                      {data.opponent.team.name}
                    </h3>

                    <p className="mt-2 text-sm font-bold text-zinc-500">
                      {data.opponent.metrics.wins}
                      -
                      {data.opponent.metrics.losses}
                      {" • "}
                      {data.opponent.dna.overall}
                      {" OVR • "}
                      {data.opponent.personality.name}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-600">
                          Scores
                        </p>

                        <p className="mt-1 text-xl font-black">
                          {data.opponent.metrics.avgFor.toFixed(
                            1,
                          )}
                          {" PPG"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-600">
                          Allows
                        </p>

                        <p className="mt-1 text-xl font-black">
                          {data.opponent.metrics.avgAgainst.toFixed(
                            1,
                          )}
                          {" PPG"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
                      Last 3 Games
                    </p>

                    <div className="mt-3 space-y-2">
                      {[...data.opponent.metrics.results]
                        .reverse()
                        .slice(
                          0,
                          3,
                        )
                        .map(
                          (
                            result,
                          ) => (
                            <div
                              key={
                                result.gameId
                              }
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3"
                            >
                              <div>
                                <span className={`mr-3 font-black ${
                                  result.result ===
                                  "W"
                                    ? "text-emerald-300"
                                    : result.result ===
                                        "L"
                                      ? "text-red-300"
                                      : "text-zinc-300"
                                }`}>
                                  {result.result}
                                </span>

                                <span className="text-sm font-bold">
                                  vs{" "}
                                  {result.opponent}
                                </span>
                              </div>

                              <span className="font-black">
                                {result.pf}
                                -
                                {result.pa}
                              </span>
                            </div>
                          ),
                        )}
                    </div>

                    <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
                      <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-600">
                        Intelligence Note
                      </p>

                      <p className="mt-2 text-sm font-bold leading-6 text-zinc-300">
                        {data.opponent.personality.description}
                        {" "}
                        Their current owner profile grades at{" "}
                        {data.opponent.dna.overall}
                        {" OVR with a "}
                        {data.opponent.dna.clutch}
                        {" clutch rating."}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-zinc-500">
                No current matchup is available to scout yet.
              </div>
            )}
          </section>

          {data.rivalry &&
          data.opponent ? (
            <section
              id="rivalry"
              className="mt-5 rounded-[1.75rem] border border-orange-400/20 bg-orange-400/[0.055] p-6"
            >
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-300">
                Rivalry Engine
              </p>

              <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-3xl font-black">
                    {data.myTeam?.abbreviation}
                    {" vs "}
                    {data.opponent.team.abbreviation}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-zinc-400">
                    Series:{" "}
                    {data.rivalry.teamWins}
                    -
                    {data.rivalry.opponentWins}
                    {" • "}
                    {data.rivalry.meetings}
                    {" meetings • Avg margin "}
                    {data.rivalry.averageMargin}
                  </p>
                </div>

                <p className="text-2xl">
                  {"🔥".repeat(
                    data.rivalry.heat,
                  )}
                </p>
              </div>
            </section>
          ) : null}

          <section
            id="belt"
            className="mt-5 grid gap-4 lg:grid-cols-2"
          >
            <article className="rounded-[1.75rem] border border-amber-400/25 bg-[linear-gradient(145deg,rgba(245,158,11,.12),#090a0c)] p-6">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">
                Gold Jacket Championship
              </p>

              <h2 className="mt-2 text-3xl font-black">
                👑 THE BELT
              </h2>

              {data.belt?.holder ? (
                <>
                  <p className="mt-6 text-4xl font-black">
                    {data.belt.holder.name}
                  </p>

                  <p className="mt-2 text-sm font-bold text-zinc-500">
                    {data.belt.defenses}
                    {" successful defenses"}
                  </p>
                </>
              ) : (
                <p className="mt-6 text-zinc-500">
                  VACANT — the Season 1 Super Bowl champion will become the first Gold Jacket Belt holder.
                </p>
              )}
            </article>

            <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Recent Belt History
              </p>

              <div className="mt-4 space-y-3">
                {data.belt?.history
                  .slice(
                    0,
                    5,
                  )
                  .map(
                    (
                      event,
                      index,
                    ) => (
                      <div
                        key={`${event.season}-${event.week}-${index}`}
                        className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3"
                      >
                        <div>
                          <p className="text-sm font-black">
                            {event.toTeam}
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-600">
                            S{event.season}
                            {" • "}
                            W{event.week}
                          </p>
                        </div>

                        <span className="text-lg">
                          👑
                        </span>
                      </div>
                    ),
                  )}
              </div>
            </article>
          </section>

          <section
            id="fraud"
            className="mt-5"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-300">
              Community Intelligence
            </p>

            <h2 className="mt-1 text-3xl font-black">
              🚨 Fraud Watch
            </h2>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {data.fraudWatch.map(
                (
                  profile,
                  index,
                ) => (
                  <article
                    key={
                      profile.team.id
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <p className="text-[9px] font-black text-zinc-600">
                      #{index + 1}
                    </p>

                    <p className="mt-2 text-lg font-black">
                      {profile.team.abbreviation}
                    </p>

                    <p className="mt-3 text-xs font-black text-red-300">
                      {profile.fraud.label}
                    </p>

                    <p className="mt-2 text-xs text-zinc-500">
                      {profile.metrics.wins}
                      -
                      {profile.metrics.losses}
                      {" • PD "}
                      {profile.metrics.pointDiff.toFixed(
                        1,
                      )}
                    </p>
                  </article>
                ),
              )}
            </div>
          </section>

          <section
            id="achievements"
            className="mt-5"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-300">
              Hidden Unlocks
            </p>

            <h2 className="mt-1 text-3xl font-black">
              Achievements
            </h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {data.achievements.map(
                (
                  achievement,
                ) => (
                  <article
                    key={
                      achievement.name
                    }
                    className={`rounded-2xl border p-5 ${
                      achievement.unlocked
                        ? "border-purple-400/25 bg-purple-400/[0.08]"
                        : "border-white/[0.07] bg-black/30 opacity-45"
                    }`}
                  >
                    <p className="text-2xl">
                      {achievement.unlocked
                        ? achievement.icon
                        : "🔒"}
                    </p>

                    <p className="mt-3 text-sm font-black">
                      {achievement.unlocked
                        ? achievement.name
                        : "???"}
                    </p>

                    <p className="mt-2 text-[11px] leading-5 text-zinc-500">
                      {achievement.unlocked
                        ? achievement.description
                        : "Secret requirement"}
                    </p>
                  </article>
                ),
              )}
            </div>
          </section>

          <section
            id="recaps"
            className="mt-7"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-300">
              Auto Generated
            </p>

            <h2 className="mt-1 text-3xl font-black">
              Game Recaps
            </h2>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {data.recaps
                .slice(
                  0,
                  6,
                )
                .map(
                  (game) => (
                    <article
                      key={
                        game.id
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600">
                        Week{" "}
                        {game.week}
                      </p>

                      <h3 className="mt-2 text-lg font-black">
                        {game.headline}
                      </h3>

                      <div className="mt-4 flex items-center justify-between text-sm font-black">
                        <span>
                          {game.away?.abbreviation}
                        </span>

                        <span>
                          {game.away?.score}
                          {" — "}
                          {game.home?.score}
                        </span>

                        <span>
                          {game.home?.abbreviation}
                        </span>
                      </div>
                    </article>
                  ),
                )}
            </div>
          </section>

          <section
            id="universe"
            className="mt-7 rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-6"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-300">
              Permanent League Memory
            </p>

            <h2 className="mt-1 text-3xl font-black">
              Gold Jacket Universe
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              The league timeline grows automatically every week.
            </p>

            <div className="mt-5 space-y-3">
              {data.universe.length ? (
                data.universe.map(
                  (
                    event,
                    index,
                  ) => (
                    <div
                      key={`${event.date}-${index}`}
                      className="flex gap-4 rounded-xl border border-white/[0.07] bg-black/25 p-4"
                    >
                      <span className="text-xl">
                        {event.icon}
                      </span>

                      <div>
                        <p className="font-black">
                          {event.title}
                        </p>

                        {event.detail ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            {event.detail}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ),
                )
              ) : (
                <p className="text-sm text-zinc-600">
                  Weekly history will appear here as Autopilot publishes league events.
                </p>
              )}
            </div>
          </section>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              href="/my-game"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs font-black"
            >
              My Game
            </Link>

            <Link
              href="/predictions"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs font-black"
            >
              Predictions
            </Link>

            <Link
              href="/league"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs font-black"
            >
              League
            </Link>

            <Link
              href="/home"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs font-black"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
