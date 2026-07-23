"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const leagueLinks = [
  { label: "Dashboard", href: "/" },
  { label: "Standings", href: "/standings" },
  { label: "Teams", href: "/teams" },
  { label: "Schedule", href: "/schedule" },
];

const commissionerLinks = [
  { label: "League Health", href: "/commissioner" },
  { label: "Active Checks", href: "/active-checks" },
  { label: "Staff Applications", href: "/staff" },
  { label: "Trades", href: "/trade-center" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-72 flex-col border-r border-zinc-800 bg-[#050505] px-6 py-8">

      <div>

        <h1 className="text-3xl font-black tracking-tight">
          NEW ERA
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Madden 27 Franchise
        </p>

      </div>

      <div className="mt-12">

        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-600">
          League
        </p>

        <div className="space-y-2">

          {leagueLinks.map((link) => {

            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-xl px-4 py-3 transition ${
                  active
                    ? "bg-red-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );

          })}

        </div>

      </div>

      <div className="mt-10">

        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-600">
          Commissioner
        </p>

        <div className="space-y-2">

          {commissionerLinks.map((link) => {

            const active = pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-xl px-4 py-3 transition ${
                  active
                    ? "bg-red-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );

          })}

        </div>

      </div>

      <div className="mt-auto rounded-xl border border-zinc-800 bg-zinc-900 p-4">

        <p className="text-sm text-zinc-400">
          League Status
        </p>

        <h2 className="mt-2 text-xl font-black text-green-400">
          Healthy
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          32 / 32 Owners Active
        </p>

      </div>

    </aside>
  );
}