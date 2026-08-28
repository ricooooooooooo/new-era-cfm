import Image from "next/image";
import Link from "next/link";

import AppLayout from "@/app/components/layout/AppLayout";
import type { Team } from "@/app/data/teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type TeamTab =
  | "overview"
  | "roster"
  | "schedule"
  | "stats"
  | "depth-chart"
  | "contracts"
  | "draft-picks";

type TeamPageShellProps = {
  team: Team;
  activeTab: TeamTab;
  children: React.ReactNode;
};

const tabs: Array<{
  id: TeamTab;
  label: string;
  path: string;
}> = [
  { id: "overview", label: "Overview", path: "" },
  { id: "roster", label: "Roster", path: "/roster" },
  { id: "schedule", label: "Schedule", path: "/schedule" },
  { id: "stats", label: "Stats", path: "/stats" },
  {
    id: "depth-chart",
    label: "Depth Chart",
    path: "/depth-chart",
  },
  {
    id: "contracts",
    label: "Contracts",
    path: "/contracts",
  },
  {
    id: "draft-picks",
    label: "Draft Picks",
    path: "/draft-picks",
  },
];

async function liveHeader(team: Team) {
  const leagueResult = await supabaseAdmin
    .from("leagues")
    .select("id, season, current_week")
    .eq("slug", "gold-jacket-cfm")
    .maybeSingle();

  if (
    leagueResult.error ||
    !leagueResult.data
  ) {
    return {
      record: "—",
      owner: "Not connected",
      currentWeek: null,
    };
  }

  const league = leagueResult.data;

  const teamResult = await supabaseAdmin
    .from("teams")
    .select("id, owner_member_id")
    .eq("league_id", league.id)
    .eq("abbreviation", team.short)
    .maybeSingle();

  if (
    teamResult.error ||
    !teamResult.data
  ) {
    return {
      record: "—",
      owner: "Not connected",
      currentWeek: league.current_week,
    };
  }

  const gamesResult = await supabaseAdmin
    .from("league_games")
    .select(
      "home_team_id, away_team_id, home_score, away_score",
    )
    .eq("league_id", league.id)
    .eq("season", Number(league.season ?? 1))
    .eq("status", "final")
    .or(
      `home_team_id.eq.${teamResult.data.id},away_team_id.eq.${teamResult.data.id}`,
    );

  let wins = 0;
  let losses = 0;
  let ties = 0;

  for (const game of gamesResult.data ?? []) {
    const home =
      String(game.home_team_id) ===
      String(teamResult.data.id);

    const teamScore = Number(
      home ? game.home_score : game.away_score,
    );

    const opponentScore = Number(
      home ? game.away_score : game.home_score,
    );

    if (teamScore > opponentScore) wins += 1;
    else if (teamScore < opponentScore)
      losses += 1;
    else ties += 1;
  }

  let owner = "Not connected";

  if (teamResult.data.owner_member_id) {
    const ownerResult = await supabaseAdmin
      .from("members")
      .select("display_name, discord_username")
      .eq(
        "id",
        teamResult.data.owner_member_id,
      )
      .maybeSingle();

    owner =
      ownerResult.data?.display_name ||
      ownerResult.data?.discord_username ||
      "Claimed";
  }

  return {
    record: ties
      ? `${wins}-${losses}-${ties}`
      : `${wins}-${losses}`,
    owner,
    currentWeek: Number(
      league.current_week ?? 1,
    ),
  };
}

export default async function TeamPageShell({
  team,
  activeTab,
  children,
}: TeamPageShellProps) {
  const live = await liveHeader(team);

  const logo =
    `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${team.short}`;

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Back to all teams
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
          <div
            className="px-6 py-10 sm:px-8"
            style={{
              background: `linear-gradient(120deg, ${team.primaryColor}DD, ${team.secondaryColor}99 45%, #09090b 88%)`,
            }}
          >
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl border border-white/20 bg-black/30">
                  <Image
                    src={logo}
                    alt={`${team.city} ${team.name}`}
                    fill
                    unoptimized
                    className="object-contain p-4"
                  />
                </div>

                <div>
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-white/70">
                    {team.division}
                  </p>

                  <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                    {team.city} {team.name}
                  </h1>

                  <p className="mt-3 text-white/70">
                    {team.stadium}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-8 rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-white/50">
                    Record
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {live.record}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-white/50">
                    Current Week
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    Week {live.currentWeek ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-white/50">
                    Owner
                  </p>
                  <p className="mt-2 max-w-44 truncate text-xl font-black">
                    {live.owner}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto border-t border-zinc-800 px-6 py-4">
            {tabs.map((tab) => {
              const active = tab.id === activeTab;

              return (
                <Link
                  key={tab.id}
                  href={`/teams/${team.slug}${tab.path}`}
                  aria-current={
                    active ? "page" : undefined
                  }
                  className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "bg-red-600 text-white"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </section>

        {children}
      </main>
    </AppLayout>
  );
}

type TeamDataPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  items?: string[];
};

export function TeamDataPlaceholder({
  eyebrow,
  title,
  description,
  items = [],
}: TeamDataPlaceholderProps) {
  return (
    <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-red-500">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black text-white">
        {title}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
        {description}
      </p>

      {items.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-4"
            >
              <p className="text-sm font-bold text-zinc-400">
                {item}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
