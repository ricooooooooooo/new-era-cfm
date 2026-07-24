import Link from "next/link";

const launchSteps = [
  {
    number: "01",
    title: "Connect Discord",
    description:
      "Link your Discord account to create your official NEW ERA league profile.",
    status: "Open Now",
  },
  {
    number: "02",
    title: "Team Selection",
    description:
      "Official team claiming will take place during the August 1–5 selection window.",
    status: "August 1–5",
  },
  {
    number: "03",
    title: "League Launch",
    description:
      "Schedules, standings, trades, stats, and owner tools unlock once the franchise begins.",
    status: "Coming Soon",
  },
];

const comingSoon = [
  "Team claiming",
  "League schedule",
  "Standings",
  "Trade center",
  "Power rankings",
  "League news",
];

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0e10] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-purple-600/10 blur-[110px]" />
          <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-blue-600/10 blur-[130px]" />
        </div>

        <div className="relative border-b border-white/10 px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col justify-between gap-10 xl:flex-row xl:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" />

                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Discord Registration Open
                </span>
              </div>

              <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-purple-300">
                Madden Connected Franchise
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-6xl">
                Welcome to NEW ERA
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
                Connect your Discord account now to create your league profile
                before official team selection begins.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    Team Selection
                  </p>

                  <p className="mt-1 text-sm font-black text-white">
                    August 1–5
                  </p>
                </div>

                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    Current Phase
                  </p>

                  <p className="mt-1 text-sm font-black text-white">
                    Member Registration
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-2xl border border-purple-400/20 bg-purple-400/[0.07] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
                Before team selection
              </p>

              <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-white">
                Create your profile
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Every league member should connect Discord before teams are
                officially claimed.
              </p>

              <a
                href="/api/discord/login"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-purple-500/20 transition duration-200 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/30 active:scale-[0.98]"
              >
                Connect Discord
              </a>
            </div>
          </div>
        </div>

        <div className="relative grid gap-px bg-white/10 sm:grid-cols-3">
          <div className="bg-[#0d0e10] px-6 py-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
              Registration
            </p>

            <p className="mt-2 text-3xl font-black text-white">Open</p>

            <p className="mt-2 text-sm text-zinc-500">
              Members can connect now
            </p>
          </div>

          <div className="bg-[#0d0e10] px-6 py-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
              Team Selection
            </p>

            <p className="mt-2 text-3xl font-black text-white">Aug 1–5</p>

            <p className="mt-2 text-sm text-zinc-500">
              Official claiming window
            </p>
          </div>

          <div className="bg-[#0d0e10] px-6 py-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
              League Status
            </p>

            <p className="mt-2 text-3xl font-black text-white">Preseason</p>

            <p className="mt-2 text-sm text-zinc-500">
              Full features coming soon
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
                Launch Roadmap
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
                What happens next
              </h2>
            </div>

            <span className="w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Preseason Access
            </span>
          </div>

          <div className="mt-7 space-y-4">
            {launchSteps.map((step) => (
              <div
                key={step.number}
                className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-5 sm:flex-row sm:items-center"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black text-zinc-400">
                  {step.number}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-white">
                      {step.title}
                    </h3>

                    <span className="rounded-full border border-purple-400/15 bg-purple-400/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-purple-300">
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

        <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
            In Development
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
            Coming soon
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            These areas are still being built and will unlock as NEW ERA gets
            closer to launch.
          </p>

          <div className="mt-6 space-y-3">
            {comingSoon.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 text-xs">
                  🚧
                </div>

                <p className="text-sm font-bold text-zinc-300">{feature}</p>
              </div>
            ))}
          </div>

          <Link
            href="/members"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            View League Members
          </Link>
        </article>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-purple-500/[0.08] via-white/[0.025] to-blue-500/[0.08] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
              Commissioner Announcement
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
              Connect before team selection opens.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Team claiming is planned for August 1–5. Connect your Discord
              ahead of time so your account is ready when selections begin.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Selection Window
            </p>

            <p className="mt-2 text-xl font-black text-white">August 1–5</p>
          </div>
        </div>
      </section>
    </div>
  );
}