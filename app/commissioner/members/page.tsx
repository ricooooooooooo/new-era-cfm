import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStaffRole } from "../../lib/staff";
import {
  updateMemberStatus,
  updateMemberTeam,
} from "./actions";

type SavedDiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

type MemberRecord = {
  id: string;
  discord_id: string;
  discord_username: string | null;
  display_name: string;
  role: string;
  is_staff: boolean;
  is_active: boolean;
  team: string | null;
  first_connected_at: string;
  last_seen_at: string | null;
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

function formatDate(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentDiscordUser();
  const staffRole = getStaffRole(user?.id);

  if (!user || !staffRole) {
    notFound();
  }

  const { q = "" } = await searchParams;
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("members")
    .select(
      "id, discord_id, discord_username, display_name, role, is_staff, is_active, team, first_connected_at, last_seen_at",
    )
    .order("display_name", { ascending: true });

  if (q.trim()) {
    const safeQuery = q.trim().replaceAll(",", "");
    query = query.or(
      `display_name.ilike.%${safeQuery}%,discord_username.ilike.%${safeQuery}%,team.ilike.%${safeQuery}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Members page query error:", error);
  }

  const members = (data ?? []) as MemberRecord[];

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
              Manage Members
            </h1>

            <p className="mt-3 text-zinc-400">
              Assign teams and control whether members can remain active.
            </p>
          </div>

          <form className="w-full lg:max-w-sm">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, Discord, or team..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-400/50"
            />
          </form>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] p-5 text-rose-200">
            Members could not be loaded. Make sure the team column was added in
            Supabase.
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center text-zinc-500">
            No matching members found.
          </div>
        ) : (
          <section className="grid gap-5 lg:grid-cols-2">
            {members.map((member) => {
              const isProtectedOwner =
                staffRole !== "owner" && member.discord_id === user.id;

              return (
                <article
                  key={member.id}
                  className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-[-0.03em]">
                        {member.display_name}
                      </h2>

                      <p className="mt-1 text-sm text-zinc-500">
                        @{member.discord_username ?? "unknown"}
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                          member.is_active
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-rose-400/10 text-rose-300"
                        }`}
                      >
                        {member.is_active ? "Active" : "Inactive"}
                      </span>

                      <span className="rounded-full bg-purple-400/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-300">
                        {member.role || "member"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                        Team
                      </p>
                      <p className="mt-2 font-bold text-zinc-200">
                        {member.team || "Unassigned"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                        Last Seen
                      </p>
                      <p className="mt-2 font-bold text-zinc-200">
                        {formatDate(member.last_seen_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <form action={updateMemberTeam} className="flex gap-2">
                      <input type="hidden" name="memberId" value={member.id} />

                      <input
                        name="team"
                        defaultValue={member.team ?? ""}
                        placeholder="Example: Buffalo Bills"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-purple-400/50"
                      />

                      <button
                        type="submit"
                        className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-black transition hover:from-purple-500 hover:to-indigo-500"
                      >
                        Save Team
                      </button>
                    </form>

                    <form action={updateMemberStatus}>
                      <input type="hidden" name="memberId" value={member.id} />
                      <input
                        type="hidden"
                        name="nextStatus"
                        value={member.is_active ? "false" : "true"}
                      />

                      <button
                        type="submit"
                        disabled={isProtectedOwner}
                        className={`w-full rounded-xl border px-4 py-3 text-sm font-black transition ${
                          member.is_active
                            ? "border-rose-400/20 bg-rose-400/[0.06] text-rose-300 hover:bg-rose-400/[0.1]"
                            : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300 hover:bg-emerald-400/[0.1]"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {member.is_active
                          ? "Mark Inactive"
                          : "Restore Active Status"}
                      </button>
                    </form>
                  </div>

                  <p className="mt-4 text-xs text-zinc-600">
                    Joined {formatDate(member.first_connected_at)}
                  </p>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}