import Link from "next/link";
import AppLayout from "../components/layout/AppLayout";
import { getTeamBySlug } from "../data/teams";

type ActivityStatus =
  | "ACTIVE"
  | "WARNING"
  | "HOT_SEAT"
  | "REMOVAL_ELIGIBLE";

type LeagueMember = {
  id: number;
  username: string;
  discordName: string;
  teamSlug: string;
  userGamesAvailable: number;
  userGamesPlayed: number;
  userGamesMissed: number;
  consecutiveMisses: number;
  approvedAbsences: number;
  lastGamePlayed: string;
  commissionerNote?: string;
};

const leagueMembers: LeagueMember[] = [
  {
    id: 1,
    username: "Kai",
    discordName: "@Kai",
    teamSlug: "ravens",
    userGamesAvailable: 7,
    userGamesPlayed: 7,
    userGamesMissed: 0,
    consecutiveMisses: 0,
    approvedAbsences: 0,
    lastGamePlayed: "Week 7",
  },
  {
    id: 2,
    username: "Cam",
    discordName: "@Cam",
    teamSlug: "chiefs",
    userGamesAvailable: 7,
    userGamesPlayed: 6,
    userGamesMissed: 1,
    consecutiveMisses: 1,
    approvedAbsences: 0,
    lastGamePlayed: "Week 6",
    commissionerNote: "Needs to schedule earlier this week.",
  },
  {
    id: 3,
    username: "Jay",
    discordName: "@Jay",
    teamSlug: "falcons",
    userGamesAvailable: 7,
    userGamesPlayed: 4,
    userGamesMissed: 3,
    consecutiveMisses: 2,
    approvedAbsences: 0,
    lastGamePlayed: "Week 5",
    commissionerNote: "Contact commissioner before the next advance.",
  },
  {
    id: 4,
    username: "Marcus",
    discordName: "@Marcus",
    teamSlug: "bills",
    userGamesAvailable: 6,
    userGamesPlayed: 5,
    userGamesMissed: 1,
    consecutiveMisses: 0,
    approvedAbsences: 1,
    lastGamePlayed: "Week 7",
  },
  {
    id: 5,
    username: "Devin",
    discordName: "@Devin",
    teamSlug: "bears",
    userGamesAvailable: 7,
    userGamesPlayed: 3,
    userGamesMissed: 4,
    consecutiveMisses: 3,
    approvedAbsences: 0,
    lastGamePlayed: "Week 4",
    commissionerNote: "Eligible for replacement due to inactivity.",
  },
  {
    id: 6,
    username: "Zay",
    discordName: "@Zay",
    teamSlug: "eagles",
    userGamesAvailable: 7,
    userGamesPlayed: 7,
    userGamesMissed: 0,
    consecutiveMisses: 0,
    approvedAbsences: 0,
    lastGamePlayed: "Week 7",
  },
  {
    id: 7,
    username: "Malik",
    discordName: "@Malik",
    teamSlug: "lions",
    userGamesAvailable: 7,
    userGamesPlayed: 6,
    userGamesMissed: 1,
    consecutiveMisses: 0,
    approvedAbsences: 0,
    lastGamePlayed: "Week 7",
  },
  {
    id: 8,
    username: "Jordan",
    discordName: "@Jordan",
    teamSlug: "dolphins",
    userGamesAvailable: 7,
    userGamesPlayed: 5,
    userGamesMissed: 2,
    consecutiveMisses: 1,
    approvedAbsences: 0,
    lastGamePlayed: "Week 6",
  },
];

function getActivityPercentage(member: LeagueMember) {
  if (member.userGamesAvailable === 0) {
    return 100;
  }

  return Math.round(
    (member.userGamesPlayed / member.userGamesAvailable) * 100,
  );
}

function getActivityStatus(member: LeagueMember): ActivityStatus {
  const percentage = getActivityPercentage(member);

  if (member.consecutiveMisses >= 3 || percentage < 45) {
    return "REMOVAL_ELIGIBLE";
  }

  if (member.consecutiveMisses >= 2 || percentage < 60) {
    return "HOT_SEAT";
  }

  if (member.userGamesMissed >= 1 || percentage < 80) {
    return "WARNING";
  }

  return "ACTIVE";
}

function getStatusLabel(status: ActivityStatus) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "WARNING":
      return "Warning";
    case "HOT_SEAT":
      return "Hot Seat";
    case "REMOVAL_ELIGIBLE":
      return "Removal Eligible";
  }
}

function getStatusStyles(status: ActivityStatus) {
  switch (status) {
    case "ACTIVE":
      return {
        badge:
          "border-emerald-900 bg-emerald-950/70 text-emerald-400",
        bar: "bg-emerald-500",
        text: "text-emerald-400",
      };
    case "WARNING":
      return {
        badge: "border-yellow-900 bg-yellow-950/70 text-yellow-400",
        bar: "bg-yellow-500",
        text: "text-yellow-400",
      };
    case "HOT_SEAT":
      return {
        badge: "border-orange-900 bg-orange-950/70 text-orange-400",
        bar: "bg-orange-500",
        text: "text-orange-400",
      };
    case "REMOVAL_ELIGIBLE":
      return {
        badge: "border-red-900 bg-red-950/70 text-red-400",
        bar: "bg-red-600",
        text: "text-red-500",
      };
  }
}

function ActivityCard({ member }: { member: LeagueMember }) {
  const team = getTeamBySlug(member.teamSlug);

  if (!team) {
    return null;
  }

  const percentage = getActivityPercentage(member);
  const status = getActivityStatus(member);
  const styles = getStatusStyles(status);

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
      <div
        className="h-1.5"
        style={{
          background: `linear-gradient(90deg, ${team.primaryColor}, ${team.secondaryColor})`,
        }}
      />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <Link
            href={`/teams/${team.slug}`}
            className="group flex min-w-0 items-center gap-4"
          >
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-sm font-black text-white"
              style={{
                backgroundColor: team.primaryColor,
                borderColor: team.secondaryColor,
              }}
            >
              {team.short}
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black transition group-hover:text-red-500">
                {member.username}
              </p>

              <p className="mt-1 truncate text-sm font-bold text-zinc-500">
                {team.city} {team.name}
              </p>
            </div>
          </Link>

          <span
            className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider ${styles.badge}`}
          >
            {getStatusLabel(status)}
          </span>
        </div>

        <div className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-600">
                Activity Rate
              </p>

              <p className={`mt-2 text-4xl font-black ${styles.text}`}>
                {percentage}%
              </p>
            </div>

            <p className="text-sm font-bold text-zinc-500">
              {member.userGamesPlayed}/{member.userGamesAvailable} played
            </p>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full ${styles.bar}`}
              style={{
                width: `${Math.min(percentage, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <p className="text-xs font-black uppercase tracking-wider text-zinc-600">
              Played
            </p>

            <p className="mt-2 text-2xl font-black">
              {member.userGamesPlayed}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <p className="text-xs font-black uppercase tracking-wider text-zinc-600">
              Missed
            </p>

            <p className="mt-2 text-2xl font-black text-red-500">
              {member.userGamesMissed}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <p className="text-xs font-black uppercase tracking-wider text-zinc-600">
              Streak
            </p>

            <p className="mt-2 text-2xl font-black">
              {member.consecutiveMisses}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-zinc-800 pt-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
              Last Game
            </p>

            <p className="mt-1 text-sm font-bold text-zinc-300">
              {member.lastGamePlayed}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
              Approved Absences
            </p>

            <p className="mt-1 text-sm font-bold text-zinc-300">
              {member.approvedAbsences}
            </p>
          </div>
        </div>

        {member.commissionerNote && (
          <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/40 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
              Commissioner Note
            </p>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {member.commissionerNote}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

export default function ActivityPage() {
  const membersWithStatus = leagueMembers.map((member) => ({
    ...member,
    status: getActivityStatus(member),
  }));

  const activeMembers = membersWithStatus.filter(
    (member) => member.status === "ACTIVE",
  );

  const warningMembers = membersWithStatus.filter(
    (member) => member.status === "WARNING",
  );

  const hotSeatMembers = membersWithStatus.filter(
    (member) => member.status === "HOT_SEAT",
  );

  const removalEligibleMembers = membersWithStatus.filter(
    (member) => member.status === "REMOVAL_ELIGIBLE",
  );

  const totalGamesPlayed = leagueMembers.reduce(
    (total, member) => total + member.userGamesPlayed,
    0,
  );

  const totalGamesAvailable = leagueMembers.reduce(
    (total, member) => total + member.userGamesAvailable,
    0,
  );

  const leagueActivityRate =
    totalGamesAvailable === 0
      ? 100
      : Math.round((totalGamesPlayed / totalGamesAvailable) * 100);

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-red-500">
              League Accountability
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-tight">
              User Activity
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Track completed user games, missed games, approved absences,
              activity percentages, and members currently on the hot seat.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-black text-zinc-300 transition hover:border-zinc-600 hover:text-white">
              Export Report
            </button>

            <button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black transition hover:bg-red-500">
              Update Activity
            </button>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              League Activity
            </p>

            <p className="mt-3 text-4xl font-black">
              {leagueActivityRate}%
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              Active
            </p>

            <p className="mt-3 text-4xl font-black text-emerald-400">
              {activeMembers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              Warning
            </p>

            <p className="mt-3 text-4xl font-black text-yellow-400">
              {warningMembers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              Hot Seat
            </p>

            <p className="mt-3 text-4xl font-black text-orange-400">
              {hotSeatMembers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              Removal Eligible
            </p>

            <p className="mt-3 text-4xl font-black text-red-500">
              {removalEligibleMembers.length}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
                Activity Rules
              </p>

              <h2 className="mt-2 text-3xl font-black">
                How Status Is Calculated
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Only games against another active league user count toward the
                activity tracker.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4">
                <p className="font-black text-emerald-400">Active</p>

                <p className="mt-2 text-sm text-zinc-400">
                  At least 80% of eligible user games played with no recent
                  missed games.
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-900/60 bg-yellow-950/30 p-4">
                <p className="font-black text-yellow-400">Warning</p>

                <p className="mt-2 text-sm text-zinc-400">
                  At least one missed game or an activity percentage below
                  80%.
                </p>
              </div>

              <div className="rounded-2xl border border-orange-900/60 bg-orange-950/30 p-4">
                <p className="font-black text-orange-400">Hot Seat</p>

                <p className="mt-2 text-sm text-zinc-400">
                  Two consecutive misses or an activity percentage below 60%.
                </p>
              </div>

              <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-4">
                <p className="font-black text-red-400">
                  Removal Eligible
                </p>

                <p className="mt-2 text-sm text-zinc-400">
                  Three consecutive misses or an activity percentage below
                  45%.
                </p>
              </div>
            </div>
          </div>
        </section>

        {removalEligibleMembers.length > 0 && (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
                  Immediate Attention
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Removal Eligible
                </h2>
              </div>

              <p className="text-sm font-bold text-zinc-500">
                {removalEligibleMembers.length} member
                {removalEligibleMembers.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {removalEligibleMembers.map((member) => (
                <ActivityCard key={member.id} member={member} />
              ))}
            </div>
          </section>
        )}

        {hotSeatMembers.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
                  Inactivity Watch
                </p>

                <h2 className="mt-2 text-3xl font-black">Hot Seat</h2>
              </div>

              <p className="text-sm font-bold text-zinc-500">
                {hotSeatMembers.length} member
                {hotSeatMembers.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {hotSeatMembers.map((member) => (
                <ActivityCard key={member.id} member={member} />
              ))}
            </div>
          </section>
        )}

        {warningMembers.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-400">
                  Needs Improvement
                </p>

                <h2 className="mt-2 text-3xl font-black">Warning</h2>
              </div>

              <p className="text-sm font-bold text-zinc-500">
                {warningMembers.length} member
                {warningMembers.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {warningMembers.map((member) => (
                <ActivityCard key={member.id} member={member} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">
                Good Standing
              </p>

              <h2 className="mt-2 text-3xl font-black">Active Members</h2>
            </div>

            <p className="text-sm font-bold text-zinc-500">
              {activeMembers.length} member
              {activeMembers.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activeMembers.map((member) => (
              <ActivityCard key={member.id} member={member} />
            ))}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}