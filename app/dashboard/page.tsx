import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import AppLayout from "@/app/components/layout/AppLayout";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncDiscordTeamAssignment } from "@/lib/discord-team-sync";
import { findTeamBySlug } from "@/lib/nfl-teams";

type SavedDiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

export const dynamic = "force-dynamic";

async function getDiscordUser(): Promise<SavedDiscordUser | null> {
  const cookieStore = await cookies();
  const encodedUser = cookieStore.get("new_era_discord_user")?.value;

  if (!encodedUser) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(encodedUser, "base64url").toString("utf8"),
    ) as SavedDiscordUser;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const user = await getDiscordUser();

  if (!user) {
    redirect("/discord-connect");
  }

  try {
    await syncDiscordTeamAssignment(user.id);
  } catch (error) {
    console.error("Dashboard team sync failed:", error);
  }

  const { data: member, error } = await supabaseAdmin
    .from("members")
    .select(
      "display_name, discord_username, role, team, is_active, last_seen_at",
    )
    .eq("discord_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Dashboard member lookup failed:", error);
  }

  const team = findTeamBySlug(member?.team ?? null);

  if (!team) {
    return (
      <AppLayout>
        <div className="min-h-[calc(100vh-8rem)] bg-[#070808] px-6 py-10 text-white">
          <div className="mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.025] p-8 shadow-2xl sm:p-12">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-purple-300">
                NEW ERA CFM
              </p>

              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                Your franchise is waiting.
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
                Once a commissioner gives you an NFL team role in Discord,
                your owner dashboard will automatically become that
                franchise&apos;s command center.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/teams"
                  className="rounded-xl bg-white px-5 py-3 text-sm font-black !text-black transition hover:bg-zinc-200 hover:!text-black"
                >
                  View All Teams
                </Link>

                <Link
                  href="/members"
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black transition hover:bg-white/[0.1]"
                >
                  Member Directory
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const teamPath = `/teams/${team.slug}`;

  const teamStyles = {
    "--team-primary": team.primary,
    "--team-secondary": team.secondary,
  } as CSSProperties;

  const dashboardLinks = [
    {
      title: "Roster",
      href: `${teamPath}/roster`,
      description: "Players, ratings and positions",
    },
    {
      title: "Depth Chart",
      href: `${teamPath}/depth-chart`,
      description: "Set your starters",
    },
    {
      title: "Schedule",
      href: `${teamPath}/schedule`,
      description: "Upcoming and completed games",
    },
    {
      title: "Stats",
      href: `${teamPath}/stats`,
      description: "Team and player production",
    },
    {
      title: "Contracts",
      href: `${teamPath}/contracts`,
      description: "Cap and contract control",
    },
    {
      title: "Draft Picks",
      href: `${teamPath}/draft-picks`,
      description: "Future draft capital",
    },
    {
      title: "Trade Center",
      href: "/trade-center",
      description: "Build and submit deals",
    },
    {
      title: "League Standings",
      href: "/standings",
      description: "Track the playoff race",
    },
  ];

  const snapshotItems = [
    {
      label: "Record",
      value: "0-0",
    },
    {
      label: "Current Week",
      value: "Preseason",
    },
    {
      label: "Owner Status",
      value: member?.is_active ? "Active" : "Inactive",
    },
  ];

  return (
    <AppLayout>
      <div
        className="relative min-h-[calc(100vh-8rem)] overflow-hidden bg-[#050606] text-white"
        style={teamStyles}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background: `
              radial-gradient(circle at 15% 10%, ${team.primary}88 0%, transparent 34%),
              radial-gradient(circle at 88% 18%, ${team.secondary}55 0%, transparent 26%),
              linear-gradient(135deg, #050606 15%, ${team.primary}22 55%, #050606 100%)
            `,
          }}
        />

        <div className="pointer-events-none absolute right-[-4rem] top-[-6rem] select-none text-[18rem] font-black leading-none tracking-[-0.12em] text-white/[0.035] sm:text-[28rem]">
          {team.abbreviation}
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-14">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-2xl backdrop-blur-xl">
            <div
              className="h-1.5 w-full"
              style={{
                background: `linear-gradient(90deg, ${team.primary}, ${team.secondary})`,
              }}
            />

            <div className="grid gap-10 p-7 sm:p-10 lg:grid-cols-[1.4fr_0.6fr] lg:p-12">
              <div>
                <p
                  className="text-xs font-black uppercase tracking-[0.32em]"
                  style={{ color: team.secondary }}
                >
                  NEW ERA FRANCHISE HQ
                </p>

                <h1 className="mt-5 text-5xl font-black tracking-[-0.075em] sm:text-7xl">
                  {team.city}
                  <span className="block">{team.name}</span>
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
                  Welcome back,{" "}
                  <span className="font-black text-white">
                    {member?.display_name ?? user.displayName}
                  </span>
                  . This is your franchise command center.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={teamPath}
                    className="rounded-xl px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${team.primary}, ${team.secondary})`,
                    }}
                  >
                    Open Team Hub
                  </Link>

                  <Link
                    href={`${teamPath}/roster`}
                    className="rounded-xl border border-white/15 bg-white/[0.07] px-5 py-3 text-sm font-black transition hover:bg-white/[0.12]"
                  >
                    Manage Roster
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div
                  className="flex aspect-square w-full max-w-[260px] items-center justify-center rounded-[2rem] border border-white/15 text-7xl font-black shadow-2xl"
                  style={{
                    background: `linear-gradient(145deg, ${team.primary}, #050606 70%)`,
                    boxShadow: `0 30px 90px ${team.primary}55`,
                  }}
                >
                  {team.abbreviation}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardLinks.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.075]"
              >
                <p className="text-lg font-black">{item.title}</p>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {item.description}
                </p>

                <p
                  className="mt-5 text-xs font-black uppercase tracking-[0.2em]"
                  style={{ color: team.secondary }}
                >
                  Open →
                </p>
              </Link>
            ))}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 lg:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
                Franchise Snapshot
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {snapshotItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-black/25 p-5"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                      {item.label}
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
                Owner Identity
              </p>

              <p className="mt-5 text-2xl font-black">
                {member?.display_name ?? user.displayName}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                @{member?.discord_username ?? user.username}
              </p>

              <div
                className="mt-5 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider"
                style={{
                  backgroundColor: `${team.primary}44`,
                  color: team.secondary,
                }}
              >
                {member?.role ?? "member"}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}