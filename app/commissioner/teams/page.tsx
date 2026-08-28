import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStaffRole } from "../../lib/staff";
import { assignTeamOwner } from "./actions";

type SavedDiscordUser = {
  id: string;
};

type MemberOption = {
  id: string;
  display_name: string;
  discord_username: string | null;
};

type TeamRecord = {
  id: string;
  city: string | null;
  name: string;
  abbreviation: string;
  conference: string | null;
  division: string | null;
  logo_url: string | null;
  owner_member_id: string | null;
  members:
    | {
        id: string;
        display_name: string;
        discord_username: string | null;
      }
    | {
        id: string;
        display_name: string;
        discord_username: string | null;
      }[]
    | null;
};

const teamAccents: Record<string, string> = {
  ARI: "#97233F",
  ATL: "#A71930",
  BAL: "#241773",
  BUF: "#00338D",
  CAR: "#0085CA",
  CHI: "#0B162A",
  CIN: "#FB4F14",
  CLE: "#311D00",
  DAL: "#003594",
  DEN: "#FB4F14",
  DET: "#0076B6",
  GB: "#203731",
  HOU: "#03202F",
  IND: "#002C5F",
  JAX: "#006778",
  KC: "#E31837",
  LV: "#A5ACAF",
  LAC: "#0080C6",
  LAR: "#003594",
  MIA: "#008E97",
  MIN: "#4F2683",
  NE: "#002244",
  NO: "#D3BC8D",
  NYG: "#0B2265",
  NYJ: "#125740",
  PHI: "#004C54",
  PIT: "#FFB612",
  SEA: "#69BE28",
  SF: "#AA0000",
  TB: "#D50A0A",
  TEN: "#4B92DB",
  WAS: "#5A1414",
};

async function getCurrentDiscordUser(): Promise<SavedDiscordUser | null> {
  const cookieStore = await cookies();
  const encodedUser = cookieStore.get("new_era_discord_user")?.value;

  if (!encodedUser) return null;

  try {
    return JSON.parse(
      Buffer.from(encodedUser, "base64url").toString("utf8"),
    ) as SavedDiscordUser;
  } catch {
    return null;
  }
}

function getOwner(team: TeamRecord) {
  if (!team.members) return null;
  return Array.isArray(team.members) ? team.members[0] ?? null : team.members;
}

function getFullTeamName(team: TeamRecord) {
  return [team.city, team.name].filter(Boolean).join(" ");
}

function getTeamAccent(abbreviation: string) {
  return teamAccents[abbreviation.toUpperCase()] ?? "#71717A";
}

export default async function TeamsPage() {
  const user = await getCurrentDiscordUser();

  if (!user || !getStaffRole(user.id)) {
    notFound();
  }

  const supabase = createServerSupabaseClient();

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .select("id, name")
    .eq("slug", "gold-jacket-cfm")
    .single();

  if (leagueError || !league) {
    console.error("League query error:", leagueError);
  }

  const [
    { data: teamsData, error: teamsError },
    { data: membersData, error: membersError },
  ] = await Promise.all([
    league
      ? supabase
          .from("teams")
          .select(
            `
              id,
              city,
              name,
              abbreviation,
              conference,
              division,
              logo_url,
              owner_member_id,
              members:owner_member_id (
                id,
                display_name,
                discord_username
              )
            `,
          )
          .eq("league_id", league.id)
          .order("conference", { ascending: true })
          .order("division", { ascending: true })
          .order("city", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("members")
      .select("id, display_name, discord_username")
      .eq("is_active", true)
      .order("display_name", { ascending: true }),
  ]);

  if (teamsError) console.error("Teams query error:", teamsError);
  if (membersError) console.error("Members query error:", membersError);

  const teams = (teamsData ?? []) as TeamRecord[];
  const members = (membersData ?? []) as MemberOption[];
  const claimedCount = teams.filter((team) => team.owner_member_id).length;
  const openCount = Math.max(teams.length - claimedCount, 0);

  return (
    <main className="min-h-screen bg-[#080909] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 rounded-[28px] border border-white/10 bg-[#0d0f12] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <a
                href="/commissioner"
                className="text-sm font-bold text-zinc-500 transition hover:text-white"
              >
                ← Commissioner Dashboard
              </a>

              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-600">
                NEW ERA Administration
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                Team Management
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Assign connected league members to all 32 NFL franchises.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 sm:px-5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Total
                </p>
                <p className="mt-1 text-2xl font-black">{teams.length}</p>
              </div>

              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.045] px-4 py-4 sm:px-5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300/70">
                  Claimed
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-300">
                  {claimedCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 sm:px-5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Open
                </p>
                <p className="mt-1 text-2xl font-black">{openCount}</p>
              </div>
            </div>
          </div>
        </header>

        {!league || teamsError ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] p-5 text-rose-200">
            The NEW ERA league or its teams could not be loaded. Run the final
            Supabase migration first.
          </div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => {
              const owner = getOwner(team);
              const accent = getTeamAccent(team.abbreviation);

              return (
                <article
                  key={team.id}
                  className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0d0f12] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-white/20"
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundColor: accent }}
                  />

                  <div
                    className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-[0.08] blur-3xl"
                    style={{ backgroundColor: accent }}
                  />

                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
                        {team.logo_url ? (
                          <img
                            src={team.logo_url}
                            alt={`${getFullTeamName(team)} logo`}
                            className="h-12 w-12 object-contain"
                          />
                        ) : (
                          <span className="text-sm font-black tracking-[0.12em] text-zinc-300">
                            {team.abbreviation}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                          {team.abbreviation}
                        </p>

                        <h2 className="mt-1 truncate text-xl font-black tracking-[-0.035em]">
                          {getFullTeamName(team)}
                        </h2>

                        <p className="mt-1 text-sm text-zinc-500">
                          {team.division ?? team.conference ?? "NFL"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                        owner
                          ? "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300"
                          : "border-white/10 bg-white/[0.035] text-zinc-500"
                      }`}
                    >
                      {owner ? "Claimed" : "Available"}
                    </span>
                  </div>

                  <div className="relative mt-6 rounded-2xl border border-white/[0.075] bg-black/20 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                      Current GM
                    </p>

                    <p className="mt-2 text-base font-black text-zinc-100">
                      {owner?.display_name ?? "Unassigned"}
                    </p>

                    <p className="mt-1 min-h-5 text-sm text-zinc-500">
                      {owner?.discord_username
                        ? `@${owner.discord_username}`
                        : "No member assigned"}
                    </p>
                  </div>

                  <form action={assignTeamOwner} className="relative mt-5 space-y-3">
                    <input type="hidden" name="teamId" value={team.id} />

                    <label className="block">
                      <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                        Assign Owner
                      </span>

                      <select
                        name="memberId"
                        defaultValue={team.owner_member_id ?? ""}
                        className="w-full rounded-xl border border-white/10 bg-[#111315] px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
                      >
                        <option value="">No owner</option>

                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.display_name}
                            {member.discord_username
                              ? ` (@${member.discord_username})`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-zinc-200 active:scale-[0.99]"
                    >
                      Save Assignment
                    </button>
                  </form>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}