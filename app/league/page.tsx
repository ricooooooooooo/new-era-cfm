import Link from "next/link";

import AppLayout from "@/app/components/layout/AppLayout";

const competition = [
  {
    icon: "📊",
    title: "Standings",
    description:
      "Playoff race, records and conference standings.",
    href: "/standings",
  },
  {
    icon: "🗓️",
    title: "Schedule",
    description:
      "Current week, results and upcoming matchups.",
    href: "/schedule",
  },
  {
    icon: "🏈",
    title: "Teams",
    description:
      "All 32 franchise hubs, rosters and team data.",
    href: "/teams",
  },
  {
    icon: "🔄",
    title: "Trade Center",
    description:
      "Submit deals and view league trade history.",
    href: "/trade-center",
  },
];

const coverage = [
  {
    icon: "🔥",
    title: "Game of the Week",
    href: "/media",
  },
  {
    icon: "🏆",
    title: "Awards",
    href: "/media",
  },
  {
    icon: "🧠",
    title: "Gold Jacket Intelligence",
    href: "/era",
  },
  {
    icon: "💰",
    title: "Gold Jacket Market",
    href: "/market",
  },
];

const community = [
  {
    icon: "👥",
    title: "Members",
    href: "/members",
  },
  {
    icon: "💰",
    title: "Gold Jacket Market",
    href: "/market",
  },
  {
    icon: "🎯",
    title: "Predictions",
    href: "/predictions",
  },
];

export default function LeaguePage() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-[#050606] px-4 py-6 text-white sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-purple-300">
            Gold Jacket
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            League
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            Everything league-wide lives here. Your everyday stuff stays in Home and My Game.
          </p>

          <section className="mt-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Competition
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {competition.map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-purple-400/25 hover:bg-white/[0.055]"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">
                        {item.icon}
                      </span>

                      <div>
                        <p className="font-black">
                          {item.title}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {item.description}
                        </p>
                      </div>

                      <span className="ml-auto text-zinc-700 transition group-hover:translate-x-1 group-hover:text-white">
                        →
                      </span>
                    </div>
                  </Link>
                ),
              )}
            </div>
          </section>

          <section className="mt-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Gold Jacket Sports
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {coverage.map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]"
                  >
                    <span className="text-2xl">
                      {item.icon}
                    </span>

                    <p className="mt-3 text-sm font-black">
                      {item.title}
                    </p>
                  </Link>
                ),
              )}
            </div>
          </section>

          <section className="mt-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Community & Economy
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {community.map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]"
                  >
                    <span className="text-2xl">
                      {item.icon}
                    </span>

                    <p className="mt-3 font-black">
                      {item.title}
                    </p>
                  </Link>
                ),
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
