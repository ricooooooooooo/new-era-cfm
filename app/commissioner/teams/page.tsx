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

export default async function TeamsPage() {
  const user = await getCurrentDiscordUser();

  if (!user || !getStaffRole(user.id)) {
    notFound();
  }

  const supabase = createServerSupabaseClient();

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .select("id, name")
    .eq("slug", "new-era-cfm")
    .single();

  if (leagueError || !league) {
    console.error("League query error:", leagueError);
  }

  const [{ data: teamsData, error: teamsError }, { data: membersData, error: membersError }] =
    await Promise.all([
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

  return (
    <main className="min-h-screen bg-[#080909] text-white">
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <a
              href="/commissioner"
              className="text-sm font-bold text-purple-300 transition hover:text-purple-200"
            >
              ← Commissioner Dashboard
            </a>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Team Management
            </h1>

            <p className="mt-3 text-zinc-400">
              Assign all 32 NFL teams to connected NEW ERA members.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Claimed
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-400">
                {claimedCount}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Open
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                {teams.length - claimedCount}
              </p>
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

              return (
                <article
                  key={team.id}
                  className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex rounded-lg bg-purple-400/10 px-2.5 py-1 text-xs font-black tracking-[0.18em] text-purple-300">
                        {team.abbreviation}
                      </div>

                      <h2 className="mt-4 text-2xl font-black tracking-[-0.03em]">
                        {getFullTeamName(team)}
                      </h2>

                      <p className="mt-1 text-sm text-zinc-500">
                        {team.division ?? team.conference ?? "NFL"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                        owner
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-white/[0.06] text-zinc-400"
                      }`}
                    >
                      {owner ? "Claimed" : "Available"}
                    </span>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                      Current Owner
                    </p>

                    <p className="mt-2 font-black text-zinc-200">
                      {owner?.display_name ?? "Unassigned"}
                    </p>

                    {owner?.discord_username && (
                      <p className="mt-1 text-sm text-zinc-500">
                        @{owner.discord_username}
                      </p>
                    )}
                  </div>

                  <form action={assignTeamOwner} className="mt-5 space-y-3">
                    <input type="hidden" name="teamId" value={team.id} />

                    <select
                      name="memberId"
                      defaultValue={team.owner_member_id ?? ""}
                      className="w-full rounded-xl border border-white/10 bg-[#111313] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/50"
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

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:from-purple-500 hover:to-indigo-500"
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