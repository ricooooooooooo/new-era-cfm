import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "@/app/components/layout/AppLayout";
import { getMemberByDiscordId } from "@/lib/db/members";

export const dynamic = "force-dynamic";

type MemberProfilePageProps = {
  params: Promise<{
    discordId: string;
  }>;
};

function getAvatarUrl(
  discordId: string,
  avatarHash: string | null,
) {
  if (!avatarHash) {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png?size=512`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getActivity(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return {
      label: "No recent activity",
      online: false,
    };
  }

  const lastSeen = new Date(lastSeenAt).getTime();

  if (Number.isNaN(lastSeen)) {
    return {
      label: "Activity unavailable",
      online: false,
    };
  }

  const difference = Math.max(0, Date.now() - lastSeen);
  const minutes = Math.floor(difference / 60_000);

  if (minutes < 5) {
    return {
      label: "Online now",
      online: true,
    };
  }

  if (minutes < 60) {
    return {
      label: `Active ${minutes} minutes ago`,
      online: false,
    };
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return {
      label: `Active ${hours} hours ago`,
      online: false,
    };
  }

  const days = Math.floor(hours / 24);

  return {
    label: `Active ${days} days ago`,
    online: false,
  };
}

export default async function MemberProfilePage({
  params,
}: MemberProfilePageProps) {
  const { discordId } = await params;
  const member = await getMemberByDiscordId(discordId);

  if (!member) {
    notFound();
  }

  const displayName =
    member.display_name?.trim() ||
    member.discord_username?.trim() ||
    "New Era Member";

  const activity = getActivity(member.last_seen_at);

  return (
    <AppLayout>
      <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 bg-[radial-gradient(circle,rgba(126,34,206,0.18),transparent_68%)]" />

        <div className="relative mx-auto max-w-7xl">
          <Link
            href="/members"
            className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
          >
            <span>←</span>
            Back to members
          </Link>

          <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.075] via-white/[0.035] to-transparent shadow-[0_30px_100px_rgba(0,0,0,0.42)]">
            <div className="relative h-44 overflow-hidden border-b border-white/10 sm:h-56">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(168,85,247,0.35),transparent_38%),radial-gradient(circle_at_80%_50%,rgba(59,130,246,0.18),transparent_42%),linear-gradient(135deg,#15111c,#090a0c_65%)]" />

              <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:36px_36px]" />
            </div>

            <div className="relative px-6 pb-8 sm:px-8 lg:px-10">
              <div className="-mt-16 flex flex-col gap-6 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                  <div className="relative w-fit">
                    <img
                      src={getAvatarUrl(
                        member.discord_id,
                        member.avatar_hash,
                      )}
                      alt={`${displayName} Discord avatar`}
                      className="h-32 w-32 rounded-[2rem] border-[6px] border-[#0b0c0e] object-cover shadow-[0_20px_55px_rgba(0,0,0,0.55)] sm:h-40 sm:w-40"
                    />

                    <span
                      className={`absolute bottom-3 right-3 h-5 w-5 rounded-full border-4 border-[#0b0c0e] ${
                        activity.online
                          ? "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]"
                          : "bg-zinc-600"
                      }`}
                    />
                  </div>

                  <div className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">
                        {displayName}
                      </h1>

                      {member.is_staff && (
                        <span className="rounded-full border border-purple-300/25 bg-purple-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-purple-200">
                          Staff
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-base text-zinc-500">
                      @{member.discord_username ?? "unknown"}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-zinc-300">
                        {member.role || "Member"}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.17em] ${
                          activity.online
                            ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
                            : "border-white/10 bg-white/[0.035] text-zinc-400"
                        }`}
                      >
                        {activity.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pb-2">
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-sm font-bold text-amber-100">
                    <span>★</span>
                    Early Supporter
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-300">
                  AI Owner Report
                </p>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white">
                  Report awaiting league activity
                </h2>

                <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
                  NEW ERA will eventually analyze scheduling,
                  gameplay, trades, Discord activity, communication,
                  and league participation to build a live owner
                  report.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Communication", "Waiting"],
                    ["Scheduling", "Waiting"],
                    ["League Activity", "Waiting"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.19em] text-zinc-600">
                        {label}
                      </p>

                      <p className="mt-2 text-sm font-bold text-zinc-300">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
                      League Timeline
                    </p>

                    <h2 className="mt-3 text-2xl font-black text-white">
                      Recent activity
                    </h2>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/15 p-8 text-center">
                  <p className="font-bold text-zinc-300">
                    No timeline events yet
                  </p>

                  <p className="mt-2 text-sm text-zinc-600">
                    Games, trades, awards, and league events will
                    appear here.
                  </p>
                </div>
              </article>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.23em] text-zinc-500">
                  Member Overview
                </p>

                <div className="mt-6 space-y-5">
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <span className="text-sm text-zinc-500">
                      Joined NEW ERA
                    </span>

                    <span className="text-right text-sm font-bold text-white">
                      {formatDate(member.first_connected_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <span className="text-sm text-zinc-500">
                      Last seen
                    </span>

                    <span className="text-right text-sm font-bold text-white">
                      {activity.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <span className="text-sm text-zinc-500">
                      Member status
                    </span>

                    <span className="text-right text-sm font-bold text-white">
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-zinc-500">
                      League role
                    </span>

                    <span className="text-right text-sm font-bold capitalize text-white">
                      {member.role || "Member"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.07] to-white/[0.015] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.23em] text-amber-200/70">
                  Featured Badge
                </p>

                <div className="mt-5 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] text-2xl">
                    ★
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">
                      Early Supporter
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      Connected during early access.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}