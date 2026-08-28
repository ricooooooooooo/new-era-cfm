import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStaffRole } from "../lib/staff";

type SavedDiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

type RecentMember = {
  id: string;
  discord_username: string | null;
  display_name: string;
  role: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  first_connected_at: string;
};

async function getCurrentDiscordUser(): Promise<SavedDiscordUser | null> {
  const cookieStore = await cookies();
  const encodedUser = cookieStore.get("gold_jacket_discord_user")?.value;

  if (!encodedUser) return null;

  try {
    const decodedUser = Buffer.from(encodedUser, "base64url").toString("utf8");
    return JSON.parse(decodedUser) as SavedDiscordUser;
  } catch {
    return null;
  }
}

function formatDate(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function CommissionerPage() {
  const user = await getCurrentDiscordUser();
  const staffRole = getStaffRole(user?.id);

  if (!user || !staffRole) {
    notFound();
  }

  const supabase = createServerSupabaseClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    totalMembersResult,
    activeMembersResult,
    staffMembersResult,
    recentMembersResult,
    recentlySeenResult,
    pendingApplicationsResult,
  ] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }),

    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),

    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("is_staff", true),

    supabase
      .from("members")
      .select(
        "id, discord_username, display_name, role, is_active, last_seen_at, first_connected_at",
      )
      .order("first_connected_at", { ascending: false })
      .limit(6),

    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .gte("last_seen_at", oneDayAgo),

    supabase
      .from("staff_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const errors = [
    totalMembersResult.error,
    activeMembersResult.error,
    staffMembersResult.error,
    recentMembersResult.error,
    recentlySeenResult.error,
    pendingApplicationsResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error("Commissioner dashboard data error:", errors);
  }

  const pendingApplications = pendingApplicationsResult.count ?? 0;

  const overview = [
    {
      title: "Registered Members",
      value: totalMembersResult.count ?? 0,
      subtitle: "Connected through Discord",
      valueClass: "text-white",
    },
    {
      title: "Active Members",
      value: activeMembersResult.count ?? 0,
      subtitle: "Currently enabled",
      valueClass: "text-emerald-400",
    },
    {
      title: "Staff Members",
      value: staffMembersResult.count ?? 0,
      subtitle: "Owners and commissioners",
      valueClass: "text-amber-300",
    },
    {
      title: "Pending Applications",
      value: pendingApplications,
      subtitle: "Staff applications awaiting review",
      valueClass:
        pendingApplications > 0 ? "text-amber-300" : "text-zinc-400",
    },
  ];

  const recentMembers = (recentMembersResult.data ?? []) as RecentMember[];

  return (
    <main className="min-h-screen bg-[#080909] text-white">
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              {staffRole === "owner"
                ? "Owner Access"
                : "Commissioner Access"}
            </div>

            <h1 className="text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Commissioner Dashboard
            </h1>

            <p className="mt-3 text-zinc-400">
              Welcome back, {user.displayName}. Live league data is connected.
            </p>
          </div>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
          >
            Back to Website
          </a>
        </header>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {overview.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.065] to-white/[0.02] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                {item.title}
              </p>

              <h2 className={`mt-4 text-4xl font-black ${item.valueClass}`}>
                {item.value}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">{item.subtitle}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Live Members
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">
                  Recent Signups
                </h2>
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {recentMembers.length === 0 ? (
                <p className="p-6 text-sm text-zinc-500">
                  No members have connected yet.
                </p>
              ) : (
                recentMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black text-white">
                        {member.display_name}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        @{member.discord_username ?? "unknown"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span
                        className={`rounded-full px-3 py-1 ${
                          member.is_active
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-rose-400/10 text-rose-300"
                        }`}
                      >
                        {member.is_active ? "Active" : "Inactive"}
                      </span>

                      <span className="rounded-full bg-white/[0.06] px-3 py-1 text-zinc-300">
                        {member.role || "member"}
                      </span>

                      <span className="text-zinc-500">
                        Joined {formatDate(member.first_connected_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Management
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">
              Quick Actions
            </h2>

            <div className="mt-6 space-y-3">
              <a
                href="/commissioner/members"
                className="block w-full rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 px-4 py-3 text-center font-black text-white transition hover:from-amber-500 hover:to-indigo-500"
              >
                Manage Members
              </a>

              <a
                href="/commissioner/staff"
                className="flex w-full items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 font-black text-amber-200 transition hover:border-amber-400/40 hover:bg-amber-400/[0.12]"
              >
                <span>Review Staff Applications</span>

                <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-xs text-amber-200">
                  {pendingApplications}
                </span>
              </a>

              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-zinc-600"
              >
                Announcements — Next
              </button>

              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-zinc-600"
              >
                Activity Log — Next
              </button>

              {staffRole === "owner" && (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-amber-400/10 bg-amber-400/[0.04] px-4 py-3 font-semibold text-amber-300/50"
                >
                  Staff Permissions — Owner Only
                </button>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}