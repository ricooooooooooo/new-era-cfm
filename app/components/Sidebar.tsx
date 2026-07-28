"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

type WebsiteRole =
  | "owner"
  | "commissioner"
  | "admin"
  | "trade_committee"
  | "media_team"
  | "member";

type DiscordSessionResponse = {
  connected: boolean;
  isStaff: boolean;
  staffRole: "owner" | "commissioner" | null;
  role?: WebsiteRole | null;
  roles?: WebsiteRole[];
};

const leagueLinks = [
  { label: "Franchise HQ", href: "/dashboard" },
  { label: "League Hub", href: "/" },
  { label: "Standings", href: "/standings" },
  { label: "Teams", href: "/teams" },
  { label: "Schedule", href: "/schedule" },
  { label: "Trade Center", href: "/trade-center" },
  { label: "Apply for Staff", href: "/staff" },
];

const roleSections: Record<
  Exclude<WebsiteRole, "member">,
  {
    title: string;
    links: { label: string; href: string }[];
  }
> = {
  owner: {
    title: "Owner Center",
    links: [
      { label: "Commissioner Dashboard", href: "/commissioner" },
      { label: "Manage Members", href: "/commissioner/members" },
      { label: "Manage Roles", href: "/commissioner/roles" },
      { label: "Review Staff Applications", href: "/commissioner/staff" },
      { label: "Manage Teams", href: "/commissioner/teams" },
      { label: "Active Checks", href: "/active-checks" },
      { label: "Trade Administration", href: "/commissioner/trades" },
      { label: "Media Center", href: "/media" },
    ],
  },
  commissioner: {
    title: "Commissioner Center",
    links: [
      { label: "Commissioner Dashboard", href: "/commissioner" },
      { label: "Manage Members", href: "/commissioner/members" },
      { label: "Review Staff Applications", href: "/commissioner/staff" },
      { label: "Manage Teams", href: "/commissioner/teams" },
      { label: "Active Checks", href: "/active-checks" },
      { label: "Trade Administration", href: "/commissioner/trades" },
    ],
  },
  admin: {
    title: "Admin Center",
    links: [
      { label: "Manage Members", href: "/commissioner/members" },
      { label: "Review Staff Applications", href: "/commissioner/staff" },
      { label: "Active Checks", href: "/active-checks" },
    ],
  },
  trade_committee: {
    title: "Trade Committee",
    links: [
      { label: "Trade Center", href: "/trade-center" },
      { label: "Pending Trades", href: "/commissioner/trades" },
      { label: "Trade History", href: "/trade-center/history" },
    ],
  },
  media_team: {
    title: "Media Center",
    links: [
      { label: "Media Dashboard", href: "/media" },
      { label: "League News", href: "/media/news" },
      { label: "Game of the Week", href: "/media/game-of-the-week" },
      { label: "Power Rankings", href: "/media/power-rankings" },
      { label: "Awards", href: "/media/awards" },
    ],
  },
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [roles, setRoles] = useState<WebsiteRole[]>(["member"]);

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

        const returnedRoles: WebsiteRole[] =
          Array.isArray(data.roles) && data.roles.length > 0
            ? data.roles
            : data.role
              ? [data.role]
              : data.staffRole
                ? [data.staffRole]
                : ["member"];

        setRoles(returnedRoles);
      } catch {
        if (active) setRoles(["member"]);
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open || window.innerWidth >= 1024) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  function handleNavigationClick() {
    if (window.innerWidth < 1024) onClose();
  }

  function isLinkActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/commissioner") return pathname === "/commissioner";
    return pathname.startsWith(href);
  }

  function linkClasses(active: boolean) {
    return `group relative block overflow-hidden rounded-xl border px-4 py-3 text-sm font-semibold transition duration-200 ${
      active
        ? "border-purple-400/35 bg-purple-500/[0.12] text-white shadow-[inset_3px_0_0_rgba(168,85,247,0.95),0_14px_35px_rgba(0,0,0,0.28)]"
        : "border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
    }`;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={`fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-[90] flex w-[86vw] max-w-72 flex-col overflow-y-auto overscroll-contain border-r border-white/10 bg-[#070809] px-6 py-6 shadow-[22px_0_70px_rgba(0,0,0,0.62)] transition-transform duration-300 ease-out lg:w-72 lg:translate-x-0 lg:py-8 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <Link
            href="/dashboard"
            onClick={handleNavigationClick}
            aria-label="Go to your Franchise HQ"
            className="group flex min-w-0 items-center gap-3"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-purple-400/20 bg-white/[0.025] shadow-[0_0_26px_rgba(168,85,247,0.14)] transition duration-300 group-hover:scale-105 group-hover:shadow-[0_0_34px_rgba(168,85,247,0.28)]">
              <Image
                src="/ne-icon.png"
                alt="New Era logo"
                fill
                priority
                sizes="64px"
                className="object-contain"
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black tracking-[-0.045em] text-white">
                NEW ERA
              </h1>

              <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.24em] text-amber-300/70">
                Madden 27 Franchise
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] text-2xl leading-none text-zinc-400 transition hover:border-purple-400/30 hover:bg-white/[0.05] hover:text-white lg:hidden"
          >
            ×
          </button>
        </div>

        <div className="mt-8 h-px bg-gradient-to-r from-transparent via-purple-400/35 to-transparent" />

        <div className="mt-8">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-amber-300/70">
            League
          </p>

          <div className="space-y-2">
            {leagueLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleNavigationClick}
                className={linkClasses(isLinkActive(link.href))}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {roles
          .filter(
            (role): role is Exclude<WebsiteRole, "member"> =>
              role !== "member" && Boolean(roleSections[role]),
          )
          .map((role) => {
            const section = roleSections[role];

            return (
              <div key={role} className="mt-10">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300/70">
                    {section.title}
                  </p>

                  <span className="rounded-full border border-purple-400/25 bg-purple-400/[0.07] px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-purple-200">
                    {role.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="space-y-2">
                  {section.links.map((link) => (
                    <Link
                      key={`${role}-${link.href}`}
                      href={link.href}
                      onClick={handleNavigationClick}
                      className={linkClasses(isLinkActive(link.href))}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

        <div className="mt-auto pt-8">
          <div className="overflow-hidden rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/[0.08] to-white/[0.02] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-300">
                League Status
              </p>

              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            </div>

            <h2 className="mt-3 text-xl font-black text-white">
              Healthy
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              32 / 32 Owners Active
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}