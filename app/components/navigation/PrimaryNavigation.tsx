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
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[21px] w-[21px]"
      aria-hidden="true"
    >
      <path
        d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GameIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[21px] w-[21px]"
      aria-hidden="true"
    >
      <path
        d="M8.5 8.5h7a6 6 0 0 1 5.75 7.7l-.7 2.4a2.4 2.4 0 0 1-4.05 1l-1.65-1.85h-5.7L7.5 19.6a2.4 2.4 0 0 1-4.05-1l-.7-2.4A6 6 0 0 1 8.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M7 12v4M5 14h4M16.5 12.5h.01M18.5 15h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[21px] w-[21px]"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M14.7 8.5c-.65-.55-1.5-.85-2.55-.85-1.55 0-2.65.73-2.65 1.85 0 1.15.92 1.62 2.65 2 1.75.38 2.65.85 2.65 2 0 1.15-1.08 1.85-2.7 1.85-1.15 0-2.15-.35-2.9-1.05M12 5.9v12.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LeagueIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[21px] w-[21px]"
      aria-hidden="true"
    >
      <path
        d="M7 4h10v4.5A5 5 0 0 1 12 13.5a5 5 0 0 1-5-5V4Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11M12 13.5V18M8.5 20h7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[21px] w-[21px]"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5 20c.7-3.6 3.05-5.5 7-5.5s6.3 1.9 7 5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

const items: NavItem[] = [
  {
    label: "Home",
    href: "/home",
    icon: <HomeIcon />,
    match: (pathname) =>
      pathname === "/home",
  },
  {
    label: "My Game",
    href: "/my-game",
    icon: <GameIcon />,
    match: (pathname) =>
      pathname.startsWith("/my-game"),
  },
  {
    label: "Bet",
    href: "/predictions",
    icon: <BetIcon />,
    match: (pathname) =>
      pathname.startsWith("/predictions"),
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
      pathname.startsWith("/trade-center") ||
      pathname.startsWith("/media"),
  },
  {
    label: "Me",
    href: "/me",
    icon: <ProfileIcon />,
    match: (pathname) =>
      pathname === "/me" ||
      pathname.startsWith("/members/") ||
      pathname.startsWith("/market") ||
      pathname.startsWith("/dashboard"),
  },
];

export default function PrimaryNavigation() {
  const pathname = usePathname();

  return (
    <>
      {/* DESKTOP / MAC */}
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-20 border-r border-white/10 bg-[#070809]/95 backdrop-blur-xl lg:flex lg:flex-col lg:items-center">
        <nav className="flex w-full flex-1 flex-col items-center gap-2 px-2 pt-5">
          {items.map((item) => {
            const active =
              item.match(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-3 text-center transition ${
                  active
                    ? "bg-purple-500/[0.14] text-white"
                    : "text-zinc-600 hover:bg-white/[0.045] hover:text-zinc-200"
                }`}
              >
                <span
                  className={
                    active
                      ? "text-purple-300"
                      : ""
                  }
                >
                  {item.icon}
                </span>

                <span className="text-[9px] font-black uppercase tracking-[0.08em]">
                  {item.label}
                </span>

                {active ? (
                  <span className="absolute left-0 h-7 w-[2px] rounded-r bg-purple-400" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mb-5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.7)]" />
      </aside>

      {/* IPHONE */}
      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-[#08090b]/95 px-1 pt-1.5 shadow-[0_-18px_50px_rgba(0,0,0,.45)] backdrop-blur-2xl lg:hidden"
        style={{
          paddingBottom:
            "max(0.45rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {items.map((item) => {
            const active =
              item.match(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-h-[58px] touch-manipulation flex-col items-center justify-center gap-1 rounded-xl transition active:scale-95 ${
                  active
                    ? "text-white"
                    : "text-zinc-600"
                }`}
              >
                <span
                  className={
                    active
                      ? "text-purple-300"
                      : ""
                  }
                >
                  {item.icon}
                </span>

                <span className="text-[9px] font-black">
                  {item.label}
                </span>

                {active ? (
                  <span className="absolute top-0 h-[2px] w-7 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,.8)]" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
