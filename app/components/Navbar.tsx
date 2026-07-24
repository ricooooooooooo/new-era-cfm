"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavbarProps = {
  onMenuClick: () => void;
};

type DiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

const navLinks = [
  { label: "Dashboard", href: "/", ready: true },
  { label: "Standings", href: "/standings", ready: true },
  { label: "Teams", href: "/teams", ready: true },
  { label: "Schedule", href: "/schedule", ready: false },
  { label: "Trades", href: "/trades", ready: false },
];

export default function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<DiscordUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    async function loadDiscordUser() {
      try {
        const response = await fetch("/api/discord/me", {
          cache: "no-store",
        });

        const data = await response.json();

        if (data.connected && data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Failed to load Discord user:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDiscordUser();
  }, []);

  useEffect(() => {
    function closeDropdown(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", closeDropdown);

    return () => {
      document.removeEventListener("mousedown", closeDropdown);
    };
  }, []);

  const avatarUrl =
    user?.avatar && user.id
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : null;

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#080909]/90 px-3 shadow-[0_8px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:px-6 lg:ml-72">
      <div className="flex min-w-0 items-center gap-3 lg:gap-8">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-lg text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white lg:hidden"
        >
          ☰
        </button>

        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-gradient-to-br from-zinc-100 to-zinc-400 text-xs font-black text-black shadow-[0_0_22px_rgba(255,255,255,0.08)]">
            8
          </div>

          <div className="min-w-0 leading-none">
            <p className="truncate text-sm font-black tracking-[-0.025em] text-white sm:text-base">
              NEW ERA
            </p>

            <p className="mt-1 hidden text-[8px] font-bold uppercase tracking-[0.22em] text-zinc-500 sm:block">
              Connected Franchise
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            if (!link.ready) {
              return (
                <span
                  key={link.href}
                  className="cursor-not-allowed rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700"
                >
                  {link.label}
                </span>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white/[0.07] text-white"
                    : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200"
                }`}
              >
                {link.label}

                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[9px] h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="relative hidden 2xl:block">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
          >
            <path
              d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>

          <input
            type="text"
            placeholder="Search league..."
            className="w-52 rounded-xl border border-white/10 bg-white/[0.035] py-2 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 focus:bg-white/[0.055]"
          />
        </div>

        {loading ? (
          <div className="h-10 w-10 animate-pulse rounded-xl bg-white/[0.06] sm:w-32" />
        ) : user ? (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((current) => !current)}
              className={`flex items-center gap-2 rounded-xl border px-2 py-2 transition sm:px-3 ${
                dropdownOpen
                  ? "border-white/25 bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.065]"
              }`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.displayName}
                  className="h-7 w-7 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-zinc-100 to-zinc-400 text-xs font-black text-black">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="hidden text-left sm:block">
                <p className="max-w-28 truncate text-sm font-bold text-white">
                  {user.displayName}
                </p>

                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />

                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Connected
                  </p>
                </div>
              </div>

              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className={`hidden h-3.5 w-3.5 text-zinc-500 transition sm:block ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#101113]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.65)] backdrop-blur-xl">
                <div className="border-b border-white/10 px-3 py-3">
                  <p className="truncate text-sm font-bold text-white">
                    {user.displayName}
                  </p>

                  <p className="mt-1 truncate text-xs text-zinc-500">
                    @{user.username}
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/discord-connect"
                    onClick={() => setDropdownOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Discord Profile
                  </Link>

                  <Link
                    href="/teams"
                    onClick={() => setDropdownOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    League Teams
                  </Link>

                  <a
                    href="/api/discord/logout"
                    className="mt-1 block rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
                  >
                    Sign Out
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <a
            href="/api/discord/login"
            className="rounded-xl border border-white bg-white px-3 py-2 text-sm font-black text-black transition hover:bg-zinc-200 sm:px-4"
          >
            <span className="hidden sm:inline">
              Sign in with Discord
            </span>

            <span className="sm:hidden">
              Sign In
            </span>
          </a>
        )}
      </div>
    </header>
  );
}