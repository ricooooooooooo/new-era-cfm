import Link from "next/link";

import AppLayout from "@/app/components/layout/AppLayout";

const features = [
  {
    tag: "GOTW",
    icon: "🔥",
    title: "Game of the Week",
    description: "The matchup everybody should be watching.",
    href: "/gotw",
  },
  {
    tag: "POTW",
    icon: "🏆",
    title: "Players of the Week",
    description: "Weekly winners, stat lines and earned rewards.",
    href: "/potw",
  },
  {
    tag: "RANKINGS",
    icon: "📈",
    title: "Power Rankings",
    description: "Who is rising, falling and actually dangerous.",
    href: "/media/power-rankings",
  },
  {
    tag: "AWARDS",
    icon: "🥇",
    title: "Yearly Awards",
    description: "Season honors and the names that defined the year.",
    href: "/media/awards",
  },
];

const wire = [
  {
    icon: "📰",
    title: "League News",
    description: "Stories, announcements and league-wide updates.",
    href: "/media/news",
  },
  {
    icon: "🔄",
    title: "Trade Feed",
    description: "Follow completed deals and franchise movement.",
    href: "/trade-center/history",
  },
  {
    icon: "🧥",
    title: "Gold Jacket Watch",
    description: "Track the revived legends as their careers develop.",
    href: "/gold-jackets",
  },
  {
    icon: "📊",
    title: "Standings",
    description: "The playoff race behind every headline.",
    href: "/standings",
  },
];

export default function MediaPage() {
  return (
    <AppLayout>
      <main className="min-h-screen bg-[#050505] text-[#f5f0e4]">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-7 sm:px-6 lg:px-8">
          <header className="relative overflow-hidden rounded-[2rem] border border-[#d7b56d]/20 bg-[radial-gradient(circle_at_13%_0%,rgba(215,181,109,.16),transparent_28rem),linear-gradient(135deg,#12100c,#070707_62%)] p-6 shadow-[0_28px_90px_rgba(0,0,0,.35)] sm:p-10">
            <div className="pointer-events-none absolute -right-8 -top-16 text-[12rem] font-black leading-none tracking-[-0.09em] text-[#efd58a]/[0.03]">
              WIRE
            </div>

            <div className="relative max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d7b56d]">
                Gold Jacket Media
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                The league has a story.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base">
                Games, awards, rankings, trades and the Gold Jacket players
                shaping every season.
              </p>
            </div>
          </header>

          <section className="mt-7">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#95783b]">
                  Featured
                </p>
                <h2 className="mt-1 text-2xl font-black">Around Gold Jacket</h2>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {features.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group relative min-h-[205px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(145deg,rgba(215,181,109,.05),rgba(255,255,255,.018))] p-5 transition hover:-translate-y-0.5 hover:border-[#d7b56d]/35"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[8px] font-black uppercase tracking-[0.16em] text-[#a88943]">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="mt-7 text-xl font-black tracking-[-0.035em] text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    {item.description}
                  </p>
                  <span className="absolute bottom-5 left-5 text-[9px] font-black uppercase tracking-[0.12em] text-[#c4a351] transition group-hover:translate-x-1">
                    Open →
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#95783b]">
                Gold Jacket Wire
              </p>
              <h2 className="mt-1 text-2xl font-black">More from the league</h2>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {wire.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex items-center gap-4 rounded-[1.35rem] border border-white/[0.08] bg-white/[0.02] p-5 transition hover:border-[#d7b56d]/25 hover:bg-white/[0.035]"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-black text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {item.description}
                    </p>
                  </div>
                  <span className="ml-auto text-zinc-700 transition group-hover:translate-x-1 group-hover:text-[#d7b56d]">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
