"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

type DiscordSessionResponse = {
  connected: boolean;
  isStaff: boolean;
  staffRole: "owner" | "commissioner" | null;
};

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

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const [isStaff, setIsStaff] = useState(false);
  const [staffRole, setStaffRole] = useState<
    "owner" | "commissioner" | null
  >(null);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/discord/me", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as DiscordSessionResponse;

        if (!active) return;

        setIsStaff(data.isStaff);
        setStaffRole(data.staffRole);
      } catch {
        if (!active) return;

        setIsStaff(false);
        setStaffRole(null);
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function linkClasses(active: boolean) {
    return `group relative block overflow-hidden rounded-xl border px-4 py-3 text-sm font-semibold transition duration-200 ${
      active
        ? "border-white/20 bg-white/[0.09] text-white shadow-[inset_3px_0_0_rgba(255,255,255,0.9),0_12px_35px_rgba(0,0,0,0.28)]"
        : "border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
    }`;
  }

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[70] flex h-dvh w-[85vw] max-w-72 flex-col overflow-y-auto border-r border-white/10 bg-[#070809] px-6 py-6 shadow-[20px_0_60px_rgba(0,0,0,0.35)] transition-transform duration-300 lg:w-72 lg:translate-x-0 lg:py-8 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-zinc-100 to-zinc-400 text-sm font-black text-black">
              8
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-[-0.04em] text-white">
                NEW ERA
              </h1>

              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                Madden 27 Franchise
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xl text-zinc-400 transition hover:bg-white/[0.07] hover:text-white lg:hidden"
          >
            ×
          </button>
        </div>

        <div className="mt-10">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">
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
                  className={linkClasses(active)}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {isStaff && (
          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">
                Commissioner
              </p>

              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-zinc-400">
                {staffRole === "owner" ? "Owner" : "Staff"}
              </span>
            </div>

            <div className="space-y-2">
              {commissionerLinks.map((link) => {
                const active = pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={linkClasses(active)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              League Status
            </p>

            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]" />
          </div>

          <h2 className="mt-3 text-xl font-black text-white">
            Healthy
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            32 / 32 Owners Active
          </p>
        </div>
      </aside>
    </>
  );
}