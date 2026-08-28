"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[21px] w-[21px]" aria-hidden="true">
      <path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function LeagueIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[21px] w-[21px]" aria-hidden="true">
      <path d="M7 4h10v4.5A5 5 0 0 1 12 13.5a5 5 0 0 1-5-5V4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11M12 13.5V18M8.5 20h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function GoldJacketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[21px] w-[21px]" aria-hidden="true">
      <path d="m8.2 4.5 3.8 2 3.8-2 3.2 3.3-2.3 12.1H7.3L5 7.8l3.2-3.3Z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
      <path d="M12 6.5v13M8.2 4.5 10 9l2-2.5L14 9l1.8-4.5" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DevShopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[21px] w-[21px]" aria-hidden="true">
      <path d="M5 8.5h14v11H5v-11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 8.5V6.8A2.8 2.8 0 0 1 10.8 4h2.4A2.8 2.8 0 0 1 16 6.8v1.7M8.2 14h7.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MediaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[21px] w-[21px]" aria-hidden="true">
      <path d="M4 10.2v3.6h3.2l7.2 3.2V7l-7.2 3.2H4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M17.2 9.1a4 4 0 0 1 0 5.8M19.4 6.8a7.2 7.2 0 0 1 0 10.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const items: NavItem[] = [
  {
    label: "Home",
    href: "/home",
    icon: <HomeIcon />,
    match: (pathname) => pathname === "/home" || pathname.startsWith("/my-game"),
  },
  {
    label: "League",
    href: "/league",
    icon: <LeagueIcon />,
    match: (pathname) =>
      pathname === "/league" ||
      pathname.startsWith("/standings") ||
      pathname.startsWith("/schedule") ||
      pathname.startsWith("/teams") ||
      pathname.startsWith("/trade-center"),
  },
  {
    label: "Gold Jackets",
    href: "/gold-jackets",
    icon: <GoldJacketIcon />,
    match: (pathname) => pathname.startsWith("/gold-jackets"),
  },
  {
    label: "Dev Shop",
    href: "/dev-shop",
    icon: <DevShopIcon />,
    match: (pathname) => pathname.startsWith("/dev-shop") || pathname.startsWith("/market"),
  },
  {
    label: "Media",
    href: "/media",
    icon: <MediaIcon />,
    match: (pathname) =>
      pathname.startsWith("/media") ||
      pathname.startsWith("/gotw") ||
      pathname.startsWith("/potw"),
  },
];

export default function PrimaryNavigation() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-20 border-r border-[#d7b35a]/15 bg-[#080807]/95 backdrop-blur-xl lg:flex lg:flex-col lg:items-center">
        <nav className="flex w-full flex-1 flex-col items-center gap-2 px-2 pt-5">
          {items.map((item) => {
            const active = item.match(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-3 text-center transition ${
                  active
                    ? "bg-amber-300/[0.10] text-white"
                    : "text-zinc-600 hover:bg-white/[0.045] hover:text-zinc-200"
                }`}
              >
                <span className={active ? "text-amber-300" : ""}>{item.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.06em]">{item.label}</span>
                {active ? <span className="absolute left-0 h-7 w-[2px] rounded-r bg-amber-300" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mb-5 h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,.65)]" />
      </aside>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-[70] border-t border-[#d7b35a]/15 bg-[#080807]/95 px-1 pt-1.5 shadow-[0_-18px_50px_rgba(0,0,0,.45)] backdrop-blur-2xl sm:hidden"
        style={{ paddingBottom: "max(0.45rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {items.map((item) => {
            const active = item.match(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-h-[58px] touch-manipulation flex-col items-center justify-center gap-1 rounded-xl transition active:scale-95 ${active ? "text-white" : "text-zinc-600"}`}
              >
                <span className={active ? "text-amber-300" : ""}>{item.icon}</span>
                <span className="text-[9px] font-black">{item.label}</span>
                {active ? <span className="absolute top-0 h-[2px] w-7 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,.7)]" /> : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
