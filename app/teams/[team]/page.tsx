import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "../../components/layout/AppLayout";
import { getTeamBySlug, teams } from "../../data/teams";

type TeamPageProps = {
  params: Promise<{
    team: string;
  }>;
};

export function generateStaticParams() {
  return teams.map((team) => ({
    team: team.slug,
  }));
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);

  if (!team) {
    notFound();
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
        >
          <span>←</span>
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
                <div
                  className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border-2 text-3xl font-black text-white shadow-2xl"
                  style={{
                    borderColor: team.secondaryColor,
                    backgroundColor: team.primaryColor,
                  }}
                >
                  {team.short}
                </div>

                <div>
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-white/70">
                    {team.division}
                  </p>

                  <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                    {team.city} {team.name}
                  </h1>

                  <p className="mt-3 text-white/70">{team.stadium}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-8 rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-white/50">
                    Record
                  </p>
                  <p className="mt-2 text-3xl font-black text-white/70">—</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-white/50">
                    Owner
                  </p>
                  <p className="mt-2 text-xl font-black text-white/70">
                    Not assigned
                  </p>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto border-t border-zinc-800 px-6 py-4">
            {[
              "Overview",
              "Roster",
              "Schedule",
              "Stats",
              "Depth Chart",
              "Contracts",
              "Draft Picks",
            ].map((item, index) => (
              <button
                key={item}
                type="button"
                disabled={index !== 0}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition ${
                  index === 0
                    ? "bg-red-600 text-white"
                    : "cursor-not-allowed text-zinc-700"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Offense Rank" />
          <StatCard label="Defense Rank" />
          <StatCard label="Points Per Game" />
          <StatCard label="Salary Cap" />
        </section>

        <section className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/[0.05] p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">
            Madden Data Not Synced
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Franchise data is waiting for league connection
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Owner assignment, record, roster, salary cap, schedule, rankings,
            contracts, stats, and draft picks will appear here once New Era is
            connected to the Madden league data source.
          </p>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          <EmptyPanel
            eyebrow="Franchise Roster"
            title="Roster Not Available"
            description="Player names, positions, ratings, depth chart, and contracts have not been synced yet."
          />

          <EmptyPanel
            eyebrow="Upcoming"
            title="Schedule Not Available"
            description="Game weeks, opponents, locations, times, and results will appear after the league schedule is synced."
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <InfoCard label="Conference" value={team.conference} />
          <InfoCard label="Division" value={team.division} />
          <InfoCard label="Franchise Status" value="Not assigned" muted />
        </section>
      </main>
    </AppLayout>
  );
}

type StatCardProps = {
  label: string;
};

function StatCard({ label }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black text-zinc-600">—</p>

      <p className="mt-2 text-xs font-bold text-zinc-700">Not synced</p>
    </div>
  );
}

type EmptyPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
};

function EmptyPanel({ eyebrow, title, description }: EmptyPanelProps) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black">{title}</h2>

      <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-xl text-zinc-500">
          —
        </div>

        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
  muted?: boolean;
};

function InfoCard({ label, value, muted = false }: InfoCardProps) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-3 text-2xl font-black ${
          muted ? "text-zinc-500" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}