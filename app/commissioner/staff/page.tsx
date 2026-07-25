import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStaffRole } from "../../lib/staff";
import {
  approveApplication,
  denyApplication,
} from "./actions";

type SavedDiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

type StaffApplication = {
  id: string;
  member_id: string | null;
  discord_id: string;
  discord_username: string | null;
  display_name: string;
  position: string;
  why: string;
  experience: string;
  activity: string;
  status: "pending" | "approved" | "denied" | string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
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
  if (!value) return "Not reviewed";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusClasses(status: string) {
  if (status === "approved") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "denied") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}

export default async function StaffApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentDiscordUser();
  const staffRole = getStaffRole(user?.id);

  if (!user || !staffRole) {
    notFound();
  }

  const { status = "pending" } = await searchParams;

  const allowedStatuses = ["pending", "approved", "denied", "all"];
  const selectedStatus = allowedStatuses.includes(status)
    ? status
    : "pending";

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("staff_applications")
    .select(
      "id, member_id, discord_id, discord_username, display_name, position, why, experience, activity, status, reviewed_by, reviewed_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (selectedStatus !== "all") {
    query = query.eq("status", selectedStatus);
  }

  const [
    applicationsResult,
    pendingCountResult,
    approvedCountResult,
    deniedCountResult,
  ] = await Promise.all([
    query,
    supabase
      .from("staff_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("staff_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("staff_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "denied"),
  ]);

  if (applicationsResult.error) {
    console.error(
      "Staff applications page query error:",
      applicationsResult.error,
    );
  }

  const applications = (applicationsResult.data ??
    []) as StaffApplication[];

  const filters = [
    {
      label: "Pending",
      value: "pending",
      count: pendingCountResult.count ?? 0,
    },
    {
      label: "Approved",
      value: "approved",
      count: approvedCountResult.count ?? 0,
    },
    {
      label: "Denied",
      value: "denied",
      count: deniedCountResult.count ?? 0,
    },
    {
      label: "All",
      value: "all",
      count:
        (pendingCountResult.count ?? 0) +
        (approvedCountResult.count ?? 0) +
        (deniedCountResult.count ?? 0),
    },
  ];

  return (
    <main className="min-h-screen bg-[#080909] text-white">
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <header className="mb-8 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <a
              href="/commissioner"
              className="text-sm font-bold text-purple-300 transition hover:text-purple-200"
            >
              ← Commissioner Dashboard
            </a>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-400/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-purple-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {staffRole === "owner"
                ? "Owner Access"
                : "Commissioner Access"}
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Staff Applications
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Review applications submitted through the public staff page.
              Only authorized league staff can access this dashboard.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/70">
              Awaiting Review
            </p>

            <p className="mt-1 text-3xl font-black text-amber-300">
              {pendingCountResult.count ?? 0}
            </p>
          </div>
        </header>

        <nav className="mb-8 flex flex-wrap gap-3">
          {filters.map((filter) => {
            const isActive = selectedStatus === filter.value;

            return (
              <a
                key={filter.value}
                href={`/commissioner/staff?status=${filter.value}`}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition ${
                  isActive
                    ? "border-purple-400/40 bg-purple-500/15 text-purple-200"
                    : "border-white/10 bg-white/[0.035] text-zinc-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {filter.label}

                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? "bg-purple-300/15 text-purple-200"
                      : "bg-white/[0.06] text-zinc-500"
                  }`}
                >
                  {filter.count}
                </span>
              </a>
            );
          })}
        </nav>

        {applicationsResult.error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] p-5 text-rose-200">
            Staff applications could not be loaded. Check the
            staff_applications table and Supabase environment variables.
          </div>
        ) : applications.length === 0 ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-2xl">
              ✓
            </div>

            <h2 className="mt-5 text-2xl font-black">
              No {selectedStatus === "all" ? "" : selectedStatus} applications
            </h2>

            <p className="mt-2 text-zinc-500">
              Applications will appear here after members submit them.
            </p>
          </section>
        ) : (
          <section className="space-y-5">
            {applications.map((application) => {
              const isPending = application.status === "pending";

              return (
                <article
                  key={application.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02]"
                >
                  <div className="flex flex-col gap-5 border-b border-white/10 p-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black tracking-[-0.03em]">
                          {application.display_name}
                        </h2>

                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getStatusClasses(
                            application.status,
                          )}`}
                        >
                          {application.status}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-zinc-500">
                        @{application.discord_username ?? "unknown"} · Discord
                        ID {application.discord_id}
                      </p>

                      <div className="mt-4 inline-flex rounded-xl border border-purple-400/20 bg-purple-400/[0.08] px-4 py-2 text-sm font-black text-purple-200">
                        Applying for: {application.position}
                      </div>
                    </div>

                    <div className="text-left text-sm text-zinc-500 lg:text-right">
                      <p>
                        Submitted{" "}
                        <span className="font-bold text-zinc-300">
                          {formatDate(application.created_at)}
                        </span>
                      </p>

                      {!isPending && (
                        <p className="mt-1">
                          Reviewed{" "}
                          <span className="font-bold text-zinc-300">
                            {formatDate(application.reviewed_at)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 p-6 xl:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                        Why They Want The Position
                      </p>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                        {application.why}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                        Previous Experience
                      </p>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                        {application.experience}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                        Weekly Activity
                      </p>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                        {application.activity}
                      </p>
                    </div>
                  </div>

                  {isPending && (
                    <div className="grid gap-3 border-t border-white/10 bg-black/20 p-6 sm:grid-cols-2">
                      <form action={approveApplication}>
                        <input
                          type="hidden"
                          name="applicationId"
                          value={application.id}
                        />

                        <button
                          type="submit"
                          className="w-full rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-5 py-3.5 font-black text-emerald-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.14]"
                        >
                          Approve Application
                        </button>
                      </form>

                      <form action={denyApplication}>
                        <input
                          type="hidden"
                          name="applicationId"
                          value={application.id}
                        />

                        <button
                          type="submit"
                          className="w-full rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-5 py-3.5 font-black text-rose-300 transition hover:border-rose-400/40 hover:bg-rose-400/[0.14]"
                        >
                          Deny Application
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}