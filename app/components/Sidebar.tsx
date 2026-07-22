"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sidebarLinks = [
  { label: "Dashboard", href: "/", ready: true },
  { label: "League News", href: "/news", ready: false },
  { label: "Standings", href: "/standings", ready: true },
  { label: "Schedule", href: "/schedule", ready: false },
  { label: "Teams", href: "/teams", ready: true },
  { label: "Roster", href: "/roster", ready: false },
  { label: "Trades", href: "/trades", ready: false },
  { label: "Power Rankings", href: "/power-rankings", ready: false },
  { label: "Statistics", href: "/statistics", ready: false },
  { label: "Settings", href: "/settings", ready: false },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 p-4 lg:block">
      <div className="mb-4 px-3 text-xs font-bold uppercase tracking-[0.25em] text-zinc-600">
        League Menu
      </div>

      <nav className="space-y-1">
        {sidebarLinks.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          if (!link.ready) {
            return (
              <div
                key={link.href}
                className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-3 text-sm font-semibold text-zinc-600"
              >
                <span>{link.label}</span>

                <span className="rounded bg-zinc-900 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-700">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block w-full rounded-lg px-3 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-red-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}