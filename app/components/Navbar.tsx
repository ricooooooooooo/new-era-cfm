"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

export default function Navbar() {
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
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-800 bg-[#080909]/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-black tracking-tight">
          NEW ERA
          <span className="ml-1 text-red-500">CFM</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            if (!link.ready) {
              return (
                <span
                  key={link.href}
                  className="cursor-not-allowed text-zinc-700"
                >
                  {link.label}
                </span>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition ${
                  isActive
                    ? "text-white"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search league..."
          className="hidden w-52 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-600 md:block"
        />

        {loading ? (
          <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-800" />
        ) : user ? (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((current) => !current)}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.displayName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="hidden text-left sm:block">
                <p className="max-w-28 truncate text-sm font-bold text-white">
                  {user.displayName}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-green-500">
                  Connected
                </p>
              </div>

              <span
                className={`text-xs text-zinc-500 transition ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
                <div className="border-b border-zinc-800 px-3 py-3">
                  <p className="truncate text-sm font-bold text-white">
                    {user.displayName}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    @{user.username}
                  </p>
                </div>

                <Link
                  href="/discord-connect"
                  onClick={() => setDropdownOpen(false)}
                  className="mt-2 block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                >
                  Discord Profile
                </Link>

                <Link
                  href="/teams"
                  onClick={() => setDropdownOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                >
                  League Teams
                </Link>

                <a
                  href="/api/discord/logout"
                  className="mt-1 block rounded-lg px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-950/40 hover:text-red-400"
                >
                  Sign Out
                </a>
              </div>
            )}
          </div>
        ) : (
          <a
            href="/api/discord/login"
            className="rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#4752c4]"
          >
            <span className="hidden sm:inline">Sign in with Discord</span>
            <span className="sm:hidden">Sign In</span>
          </a>
        )}
      </div>
    </header>
  );
}