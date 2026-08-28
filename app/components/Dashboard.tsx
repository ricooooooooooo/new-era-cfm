import Link from "next/link";
import { cookies } from "next/headers";

const leagueFeatures = [
  {
    number: "01",
    title: "Franchise HQ",
    description:
      "Every owner gets a personalized command center built around their NFL team.",
  },
  {
    number: "02",
    title: "Discord Integration",
    description:
      "Connect once and keep your league identity, team role, and member profile synced.",
  },
  {
    number: "03",
    title: "Live League Data",
    description:
      "Standings, schedules, stats, league leaders, and results arrive with Madden 27.",
  },
  {
    number: "04",
    title: "AI League Coverage",
    description:
      "Weekly reports, power rankings, headlines, awards, and owner storylines.",
  },
  {
    number: "05",
    title: "Team Management",
    description:
      "Access rosters, depth charts, contracts, draft picks, trades, and team history.",
  },
  {
    number: "06",
    title: "Commissioner Control",
    description:
      "Purpose-built tools for announcements, owners, activity checks, and league operations.",
  },
];

const launchFeatures = [
  { label: "Personal Franchise HQ", status: "Ready" },
  { label: "Discord Member Profiles", status: "Ready" },
  { label: "32 NFL Team Hubs", status: "Ready" },
  { label: "Commissioner Dashboard", status: "Ready" },
  { label: "Live Madden 27 Stats", status: "August 6" },
  { label: "Weekly AI Coverage", status: "Launch" },
];

export default async function Dashboard() {
  const cookieStore = await cookies();

  const isDiscordConnected = Boolean(
    cookieStore.get("gold_jacket_discord_user")?.value,
  );

  return (
    <div className="bg-[#050606] text-white">
      <section className="relative min-h-[760px] overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(122,61,255,0.32),transparent_32rem)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_22%,rgba(255,190,54,0.15),transparent_28rem)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,#050606_10%,rgba(17,13,29,0.94)_48%,#050606_92%)]" />

          <div className="absolute -right-20 top-10 select-none text-[15rem] font-black leading-none tracking-[-0.12em] text-white/[0.025] sm:text-[24rem] lg:text-[34rem]">
            8
          </div>

          <div className="absolute bottom-0 left-0 h-44 w-full bg-gradient-to-t from-[#050606] to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-[760px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid w-full gap-12 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Registration Open
                </span>
              </div>

              <p className="mt-8 text-[11px] font-black uppercase tracking-[0.38em] text-zinc-500">
                Madden 27 Connected Franchise
              </p>

              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.075em] sm:text-7xl lg:text-[6.4rem]">
                THE NEXT ERA OF
                <span className="mt-2 block bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                  MADDEN FRANCHISE
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
                Built for owners who want more than another Discord server.
                GOLD JACKET combines competition, identity, live league data, and
                a custom franchise experience in one place.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                <span>Xbox Series X|S</span>
                <span className="h-1 w-1 rounded-full bg-zinc-700" />
                <span>32 NFL Teams</span>
                <span className="h-1 w-1 rounded-full bg-zinc-700" />
                <span>Launching August 6</span>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                {!isDiscordConnected ? (
                  <a
                    href="/api/discord/login"
                    className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-black !text-black shadow-[0_18px_50px_rgba(255,255,255,0.13)] transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-200"
                  >
                    Connect Discord
                  </a>
                ) : (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-black !text-black shadow-[0_18px_50px_rgba(255,255,255,0.13)] transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-200"
                  >
                    Open Franchise HQ
                  </Link>
                )}

                <Link
                  href="/teams"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.055] px-6 py-3.5 text-sm font-black text-white backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.1]"
                >
                  Explore All Teams
                </Link>
              </div>
            </div>

            <div className="xl:justify-self-end">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-[0_35px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-7">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.09),transparent_18rem)]" />

                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500">
                    Season One
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
                    Your franchise starts here.
                  </h2>

                  <p className="mt-4 text-sm leading-6 text-zinc-400">
                    Create your profile now so you are ready for team
                    selection, league tools, and Madden 27 launch.
                  </p>

                  <div className="mt-6 space-y-3">
                    {[
                      ["01", "Connect your Discord"],
                      ["02", "Create your GOLD JACKET profile"],
                      ["03", "Claim your NFL franchise"],
                      ["04", "Compete for the Season One title"],
                    ].map(([number, label]) => (
                      <div
                        key={number}
                        className="flex items-center gap-4 rounded-xl border border-white/[0.075] bg-white/[0.035] px-4 py-3.5"
                      >
                        <span className="text-[10px] font-black tracking-[0.18em] text-zinc-600">
                          {number}
                        </span>

                        <span className="text-sm font-bold text-zinc-200">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.075] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                      Madden 27 Launch
                    </p>

                    <p className="mt-2 text-2xl font-black">August 6</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid overflow-hidden rounded-[28px] border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["32", "NFL Teams", "Every franchise represented"],
            ["Live", "Discord Sync", "Profiles and team roles connected"],
            ["Custom", "League Website", "Built exclusively for GOLD JACKET"],
            ["Aug 6", "Madden 27", "Season One begins at launch"],
          ].map(([value, label, detail]) => (
            <div
              key={label}
              className="bg-[#0b0c0e] px-6 py-7 transition hover:bg-[#101215] sm:px-7"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">
                {label}
              </p>

              <p className="mt-2 text-3xl font-black tracking-[-0.05em]">
                {value}
              </p>

              <p className="mt-2 text-sm text-zinc-500">{detail}</p>
            </div>
          ))}
        </section>

        <section className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">
              More Than a Discord League
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
              Built to make every owner feel like they run a real franchise.
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">
              Every feature is designed to give GOLD JACKET its own identity,
              reward active ownership, and make the league worth checking every
              day.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {leagueFeatures.map((feature) => (
              <article
                key={feature.number}
                className="group rounded-[24px] border border-white/10 bg-white/[0.028] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-[0.22em] text-zinc-600">
                    {feature.number}
                  </span>

                  <span className="text-zinc-700 transition group-hover:text-zinc-400">
                    ↗
                  </span>
                </div>

                <h3 className="mt-10 text-2xl font-black tracking-[-0.04em]">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 pb-16 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0e10]">
            <div className="border-b border-white/10 px-6 py-7 sm:px-8">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500">
                Available in GOLD JACKET
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
                Built for launch day.
              </h2>
            </div>

            <div className="grid gap-px bg-white/10 sm:grid-cols-2">
              {launchFeatures.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center justify-between gap-4 bg-[#0c0e10] px-6 py-5 sm:px-8"
                >
                  <span className="text-sm font-bold text-zinc-300">
                    {feature.label}
                  </span>

                  <span
                    className={
                      feature.status === "Ready"
                        ? "rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-emerald-300"
                        : "rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-amber-300"
                    }
                  >
                    {feature.status}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-amber-500/20 via-[#0c0e10] to-[#0c0e10] p-7 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-16 text-[14rem] font-black leading-none text-white/[0.025]">
              8
            </div>

            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-300">
                Ready for Madden 27
              </p>

              <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.055em]">
                Connect.
                <span className="block">Claim.</span>
                <span className="block">Compete.</span>
              </h2>

              <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400">
                Join GOLD JACKET before Season One begins and secure your place in
                a franchise built differently from the ground up.
              </p>

              {!isDiscordConnected ? (
                <a
                  href="/api/discord/login"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3.5 text-sm font-black !text-black transition hover:bg-zinc-200"
                >
                  Create Your Profile
                </a>
              ) : (
                <Link
                  href="/dashboard"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3.5 text-sm font-black !text-black transition hover:bg-zinc-200"
                >
                  Enter Franchise HQ
                </Link>
              )}

              <Link
                href="/members"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] px-5 py-3.5 text-sm font-black text-white transition hover:border-white/20 hover:bg-white/[0.075]"
              >
                View League Members
              </Link>
            </div>
          </article>
        </section>

        <footer className="border-t border-white/10 py-8">
          <div className="flex flex-col gap-4 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-bold">GOLD JACKET CFM — Season One</p>

            <div className="flex flex-wrap gap-5">
              <span>Xbox Series X|S</span>
              <span>Madden 27</span>
              <span>Launching August 6</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}