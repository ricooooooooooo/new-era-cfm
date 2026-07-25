import Link from "next/link";
import { cookies } from "next/headers";

const launchSteps = [
  {
    number: "01",
    title: "Connect Discord",
    description:
      "Create your official NEW ERA profile before team selection begins.",
    status: "Open",
  },
  {
    number: "02",
    title: "Team Selection",
    description:
      "League members will officially claim teams during the selection window.",
    status: "August 1–5",
  },
  {
    number: "03",
    title: "League Launch",
    description:
      "Schedules, standings, trades, stats, and owner tools unlock with the franchise.",
    status: "Next",
  },
];

const developmentItems = [
  { label: "Discord profiles", complete: true },
  { label: "Member directory", complete: true },
  { label: "Commissioner tools", complete: true },
  { label: "NFL team database", complete: true },
  { label: "Team selection", complete: false },
  { label: "Companion sync", complete: false },
];

export default async function Dashboard() {
  const cookieStore = await cookies();
  const isDiscordConnected = Boolean(
    cookieStore.get("new_era_discord_user")?.value,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0f12] shadow-[0_28px_90px_rgba(0,0,0,0.34)]">
        <div className="relative border-b border-white/10 px-6 py-10 sm:px-9 sm:py-12 lg:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.055),transparent_36rem)]" />

          <div className="relative flex flex-col justify-between gap-10 xl:flex-row xl:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Registration Open
                </span>
              </div>

              <p className="mt-7 text-[11px] font-black uppercase tracking-[0.32em] text-zinc-500">
                Madden Connected Franchise
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-[-0.055em] text-white sm:text-6xl">
                NEW ERA
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold text-zinc-400">
                <span>Season One</span>
                <span className="h-1 w-1 rounded-full bg-zinc-700" />
                <span>Preseason</span>
              </div>

              <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
                The league is being prepared for launch. Connect your Discord
                account now so your profile is ready before team selection.
              </p>
            </div>

            {!isDiscordConnected ? (
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                  Account Setup
                </p>

                <h2 className="mt-3 text-2xl font-black tracking-[-0.035em] text-white">
                  Create your league profile
                </h2>

                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Connect Discord once and your account will be ready for team
                  selection, league tools, and future stats.
                </p>

                <a
                  href="/api/discord/login"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-black transition duration-200 hover:bg-zinc-200 active:scale-[0.99]"
                >
                  Connect Discord
                </a>
              </div>
            ) : (
              <div className="w-full max-w-sm rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.045] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Profile Ready
                </p>

                <h2 className="mt-3 text-2xl font-black tracking-[-0.035em] text-white">
                  Discord connected
                </h2>

                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Your NEW ERA profile is active and ready for the team
                  selection window.
                </p>

                <Link
                  href="/members"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-white transition hover:border-white/20 hover:bg-white/[0.075]"
                >
                  View League Members
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["32", "NFL Teams", "Loaded into NEW ERA"],
            ["0", "Teams Claimed", "All teams currently open"],
            ["Open", "Registration", "Members can connect now"],
            ["Preseason", "League Phase", "Season setup in progress"],
          ].map(([value, label, detail]) => (
            <div key={label} className="bg-[#0d0f12] px-6 py-6 sm:px-7">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">
                {label}
              </p>
              <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
                {value}
              </p>
              <p className="mt-2 text-sm text-zinc-500">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-[28px] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                Launch Roadmap
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-white">
                What happens next
              </h2>
            </div>

            <span className="w-fit rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Season One
            </span>
          </div>

          <div className="mt-7 space-y-3">
            {launchSteps.map((step) => (
              <div
                key={step.number}
                className="flex flex-col gap-4 rounded-2xl border border-white/[0.075] bg-black/20 p-5 transition duration-200 hover:border-white/15 sm:flex-row sm:items-center"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-xs font-black text-zinc-400">
                  {step.number}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-white">
                      {step.title}
                    </h3>
                    <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">
                      {step.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
            Build Progress
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-black tracking-[-0.045em] text-white">
              League setup
            </h2>
            <span className="text-sm font-black text-zinc-400">4 of 6</span>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-2/3 rounded-full bg-white/70" />
          </div>

          <div className="mt-6 space-y-3">
            {developmentItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3"
              >
                <p className="text-sm font-bold text-zinc-300">{item.label}</p>

                <span
                  className={
                    item.complete
                      ? "text-xs font-black uppercase tracking-[0.15em] text-emerald-300"
                      : "text-xs font-black uppercase tracking-[0.15em] text-zinc-600"
                  }
                >
                  {item.complete ? "Complete" : "Pending"}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/commissioner/teams"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-white transition hover:border-white/20 hover:bg-white/[0.075]"
          >
            Open Team Management
          </Link>
        </article>
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Commissioner Announcement
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
              Team selection opens August 1.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Connect your Discord account before the selection window so your
              profile is ready when official team claiming begins.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Selection Window
            </p>
            <p className="mt-2 text-xl font-black text-white">August 1–5</p>
          </div>
        </div>
      </section>
    </div>
  );
}