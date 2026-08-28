import Link from "next/link";

import AppLayout from "@/app/components/layout/AppLayout";

const competition = [
  {
    icon: "📊",
    title: "Standings",
    description: "Records, divisions, conference race and playoff positioning.",
    href: "/standings",
  },
  {
    icon: "🗓️",
    title: "Schedule",
    description: "Current week, completed games and upcoming matchups.",
    href: "/schedule",
  },
  {
    icon: "🏈",
    title: "Teams",
    description: "All 32 franchise hubs, rosters, stats and team data.",
    href: "/teams",
  },
  {
    icon: "🔄",
    title: "Trade Center",
    description: "Submit deals, review rules and follow league movement.",
    href: "/trade-center",
  },
];

const goldJacket = [
  {
    icon: "🧥",
    title: "Gold Jackets",
    description: "The 32 franchise legends and their new careers.",
    href: "/gold-jackets",
  },
  {
    icon: "🛒",
    title: "Dev Shop",
    description: "Buy tracked player upgrades with real season limits.",
    href: "/dev-shop",
  },
  {
    icon: "📰",
    title: "Media",
    description: "GOTW, POTW, rankings, awards and league stories.",
    href: "/media",
  },
  {
    icon: "👥",
    title: "Members",
    description: "Owners, teams and connected Gold Jacket accounts.",
    href: "/members",
  },
];

export default function LeaguePage() {
  return (
    <AppLayout>
      <main className="min-h-screen bg-[#050505] text-[#f5f0e4]">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-7 sm:px-6 lg:px-8">
          <header className="relative overflow-hidden rounded-[2rem] border border-[#d7b56d]/18 bg-[radial-gradient(circle_at_88%_0%,rgba(215,181,109,.16),transparent_25rem),linear-gradient(135deg,#11100d,#070707)] p-6 sm:p-9">
            <div className="pointer-events-none absolute -right-4 -top-12 text-[10rem] font-black leading-none text-[#efd488]/[0.035]">
              GJ
            </div>
            <div className="relative max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b56d]">
                Gold Jacket CFM
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                League
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                Everything you need without digging through twenty pages.
                Games, teams, trades, legends and league media all live here.
              </p>
            </div>
          </header>

          <section className="mt-7">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#94783d]">
                  Competition
                </p>
                <h2 className="mt-1 text-2xl font-black">Run the franchise</h2>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {competition.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-[#d7b56d]/30 hover:bg-[#d7b56d]/[0.035]"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="text-lg font-black text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-600">
                        {item.description}
                      </p>
                    </div>
                    <span className="ml-auto text-zinc-700 transition group-hover:translate-x-1 group-hover:text-[#e3c46f]">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#94783d]">
                Gold Jacket
              </p>
              <h2 className="mt-1 text-2xl font-black">League extras</h2>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {goldJacket.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-[1.4rem] border border-white/10 bg-[linear-gradient(145deg,rgba(215,181,109,.035),rgba(255,255,255,.018))] p-5 transition hover:border-[#d7b56d]/30"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <p className="mt-4 font-black text-white">{item.title}</p>
                  <p className="mt-2 hidden text-xs leading-5 text-zinc-600 sm:block">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-[1.6rem] border border-[#d7b56d]/18 bg-[#d7b56d]/[0.045] p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#bb9b4d]">
                  League Format
                </p>
                <p className="mt-2 text-lg font-black text-white">
                  $15 Buy-In • 48 Hour Advance • 32 Teams
                </p>
              </div>
              <Link
                href="/gold-jackets"
                className="rounded-xl bg-[#e2c16b] px-5 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#080704]"
              >
                Meet The Gold Jackets
              </Link>
            </div>
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
