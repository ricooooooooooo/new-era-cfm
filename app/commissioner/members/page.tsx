import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  updateMemberRole,
  updateMemberStatus,
  updateMemberTeam,
  type WebsiteRole,
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
  role: WebsiteRole;
  is_staff: boolean;
  is_active: boolean;
  team: string | null;
  first_connected_at: string;
  last_seen_at: string | null;
};

const MANAGEMENT_ROLES: WebsiteRole[] = [
  "owner",
  "commissioner",
  "admin",
];

const ROLE_OPTIONS: {
  value: WebsiteRole;
  label: string;
}[] = [
  {
    value: "owner",
    label: "Owner",
  },
  {
    value: "commissioner",
    label: "Commissioner",
  },
  {
    value: "admin",
    label: "Admin",
  },
  {
    value: "trade_committee",
    label: "Trade Committee",
  },
  {
    value: "media_team",
    label: "Media Team",
  },
  {
    value: "member",
    label: "Member",
  },
];

async function getCurrentDiscordUser(): Promise<SavedDiscordUser | null> {
  const cookieStore = await cookies();
  const encodedUser = cookieStore.get("gold_jacket_discord_user")?.value;

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

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRole(role: WebsiteRole) {
  return (
    ROLE_OPTIONS.find((option) => option.value === role)?.label ??
    "Member"
  );
}

function canManageRole(
  actingRole: WebsiteRole,
  targetRole: WebsiteRole,
) {
  if (actingRole === "owner") {
    return true;
  }

  if (targetRole === "owner") {
    return false;
  }

  if (actingRole === "commissioner") {
    return true;
  }

  if (actingRole === "admin") {
    return ![
      "owner",
      "commissioner",
      "admin",
    ].includes(targetRole);
  }

  return false;
}

function getAvailableRoles(
  actingRole: WebsiteRole,
): {
  value: WebsiteRole;
  label: string;
}[] {
  if (actingRole === "owner") {
    return ROLE_OPTIONS;
  }

  if (actingRole === "commissioner") {
    return ROLE_OPTIONS.filter(
      (option) => option.value !== "owner",
    );
  }

  if (actingRole === "admin") {
    return ROLE_OPTIONS.filter((option) =>
      [
        "trade_committee",
        "media_team",
        "member",
      ].includes(option.value),
    );
  }

  return [];
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentDiscordUser();

  if (!user) {
    notFound();
  }

  const { q = "" } = await searchParams;
  const supabase = createServerSupabaseClient();

  const {
    data: currentMember,
    error: currentMemberError,
  } = await supabase
    .from("members")
    .select("id, discord_id, role")
    .eq("discord_id", user.id)
    .single();

  if (currentMemberError || !currentMember) {
    notFound();
  }

  const actingRole = currentMember.role as WebsiteRole;

  if (!MANAGEMENT_ROLES.includes(actingRole)) {
    notFound();
  }

  let query = supabase
    .from("members")
    .select(
      "id, discord_id, discord_username, display_name, role, is_staff, is_active, team, first_connected_at, last_seen_at",
    )
    .order("display_name", { ascending: true });

  if (q.trim()) {
    const safeQuery = q
      .trim()
      .replaceAll(",", "");

    query = query.or(
      `display_name.ilike.%${safeQuery}%,discord_username.ilike.%${safeQuery}%,team.ilike.%${safeQuery}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Members page query error:", error);
  }

  const members = (data ?? []).map((member) => ({
    ...member,
    role: (member.role || "member") as WebsiteRole,
  })) as MemberRecord[];

  const availableRoles = getAvailableRoles(actingRole);

  return (
    <main className="min-h-screen bg-[#080909] text-white">
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <a
              href="/commissioner"
              className="text-sm font-bold text-amber-300 transition hover:text-amber-200"
            >
              ← Commissioner Dashboard
            </a>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Manage Members
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Assign teams, manage website roles and control
              member activity.
            </p>
          </div>

          <form className="w-full lg:max-w-sm">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, Discord, or team..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400/50"
            />
          </form>
        </header>

        <div className="mb-6 rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] px-5 py-4">
          <p className="text-sm text-zinc-300">
            Signed in with{" "}
            <span className="font-black text-amber-300">
              {formatRole(actingRole)}
            </span>{" "}
            permissions.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] p-5 text-rose-200">
            Members could not be loaded. Check the Supabase
            members table and permissions.
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center text-zinc-500">
            No matching members found.
          </div>
        ) : (
          <section className="grid gap-5 lg:grid-cols-2">
            {members.map((member) => {
              const roleCanBeManaged = canManageRole(
                actingRole,
                member.role,
              );

              const isCurrentUser =
                member.discord_id === user.id;

              const statusIsProtected =
                (
                  actingRole !== "owner" &&
                  member.role === "owner"
                ) ||
                (
                  actingRole !== "owner" &&
                  isCurrentUser
                );

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
                        {member.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>

                      <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-300">
                        {formatRole(member.role)}
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
                    <form
                      action={updateMemberRole}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="mb-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                          Website Role
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          This controls the member&apos;s sidebar
                          and website permissions.
                        </p>
                      </div>

                      <input
                        type="hidden"
                        name="memberId"
                        value={member.id}
                      />

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          name="role"
                          defaultValue={member.role}
                          disabled={!roleCanBeManaged}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#111313] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-amber-400/50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {roleCanBeManaged ? (
                            availableRoles.map((role) => (
                              <option
                                key={role.value}
                                value={role.value}
                              >
                                {role.label}
                              </option>
                            ))
                          ) : (
                            <option value={member.role}>
                              {formatRole(member.role)}
                            </option>
                          )}
                        </select>

                        <button
                          type="submit"
                          disabled={!roleCanBeManaged}
                          className="rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 px-5 py-3 text-sm font-black transition hover:from-amber-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Save Role
                        </button>
                      </div>

                      {!roleCanBeManaged ? (
                        <p className="mt-3 text-xs text-amber-300/70">
                          Your role cannot modify this member&apos;s
                          permissions.
                        </p>
                      ) : null}
                    </form>

                    <form
                      action={updateMemberTeam}
                      className="flex flex-col gap-2 sm:flex-row"
                    >
                      <input
                        type="hidden"
                        name="memberId"
                        value={member.id}
                      />

                      <input
                        name="team"
                        defaultValue={member.team ?? ""}
                        placeholder="Example: Buffalo Bills"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/50"
                      />

                      <button
                        type="submit"
                        className="rounded-xl bg-white/[0.08] px-4 py-3 text-sm font-black transition hover:bg-white/[0.12]"
                      >
                        Save Team
                      </button>
                    </form>

                    <form action={updateMemberStatus}>
                      <input
                        type="hidden"
                        name="memberId"
                        value={member.id}
                      />

                      <input
                        type="hidden"
                        name="nextStatus"
                        value={
                          member.is_active
                            ? "false"
                            : "true"
                        }
                      />

                      <button
                        type="submit"
                        disabled={statusIsProtected}
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