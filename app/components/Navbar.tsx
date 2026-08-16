"use client";

import Image from "next/image";
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


function DiscordIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 127.14 96.36"
      fill="currentColor"
      className="h-5 w-5 shrink-0"
    >
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83A97.68 97.68 0 0 0 49 6.83 72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.27 8.07C2.79 33.15-1.71 57.5.54 81.53A105.73 105.73 0 0 0 32.71 96.36a77.7 77.7 0 0 0 6.89-11.3 68.42 68.42 0 0 1-10.84-5.18c.91-.67 1.8-1.37 2.66-2.1 20.87 9.54 43.57 9.54 64.19 0 .87.73 1.76 1.43 2.66 2.1a68.68 68.68 0 0 1-10.86 5.19 77.22 77.22 0 0 0 6.9 11.29A105.25 105.25 0 0 0 126.6 81.53c2.64-27.84-4.5-51.97-18.9-73.46ZM42.45 65.69C36.18 65.69 31 59.98 31 52.94c0-7.03 5.05-12.75 11.45-12.75 6.46 0 11.56 5.78 11.45 12.75 0 7.04-5.05 12.75-11.45 12.75Zm42.24 0c-6.27 0-11.45-5.71-11.45-12.75 0-7.03 5.05-12.75 11.45-12.75 6.46 0 11.56 5.78 11.45 12.75 0 7.04-5.05 12.75-11.45 12.75Z" />
    </svg>
  );
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<DiscordUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDiscordUser() {
      try {
        const response = await fetch("/api/discord/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (active && data.connected && data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Failed to load Discord user:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDiscordUser();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let stopped = false;

    async function updatePresence() {
      if (stopped || document.visibilityState === "hidden") {
        return;
      }

      try {
        await fetch("/api/member/sync", {
          method: "POST",
          cache: "no-store",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error("Presence update failed:", error);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        updatePresence();
      }
    }

    updatePresence();

    const heartbeat = window.setInterval(() => {
      updatePresence();
    }, 60_000);

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener("focus", updatePresence);

    return () => {
      stopped = true;
      window.clearInterval(heartbeat);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener("focus", updatePresence);
    };
  }, [user]);

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

  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  const avatarUrl =
    user?.avatar && user.id
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : null;

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#080909]/90 px-3 shadow-[0_8px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:px-6 lg:ml-20">
      <div className="flex min-w-0 items-center gap-3 lg:gap-8">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open all tools"
          className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-200 transition hover:bg-white/[0.07] active:scale-95 active:bg-white/[0.08]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
          >
            <path
              d="M5 7h14M5 12h14M5 17h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <Link
          href="/home"
          className="group flex min-w-0 shrink items-center gap-2.5"
        >
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl transition duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_14px_rgba(168,85,247,0.4)]">
            <Image
              src="/ne-icon.png"
              alt="New Era logo"
              fill
              priority
              sizes="36px"
              className="object-contain"
            />
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
            className="w-52 rounded-xl border border-white/10 bg-white/[0.035] py-2 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-400/40 focus:bg-white/[0.055]"
          />
        </div>

        {loading ? (
          <div className="h-10 w-24 animate-pulse rounded-xl bg-white/[0.06] sm:w-32" />
        ) : user ? (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() =>
                setDropdownOpen((current) => !current)
              }
              aria-expanded={dropdownOpen}
              className={`flex touch-manipulation items-center gap-2 rounded-xl border px-2 py-2 transition active:scale-[0.98] sm:px-3 ${
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
                    Online
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
                    href={`/members/${user.id}`}
                    onClick={() => setDropdownOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    My NEW ERA Profile
                  </Link>

                  <Link
                    href="/members"
                    onClick={() => setDropdownOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    League Members
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
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#7289ff]/40 bg-[#5865F2] px-3 py-2 text-sm font-black text-white shadow-[0_0_20px_rgba(88,101,242,0.35)] transition-all duration-200 hover:scale-[1.02] hover:bg-[#6672F5] hover:shadow-[0_0_28px_rgba(88,101,242,0.55)] active:scale-95 sm:px-4"
          >
            <DiscordIcon />

            <span className="hidden sm:inline">
              Connect Discord
            </span>

            <span className="sm:hidden">Connect</span>
          </a>
        )}
      </div>
    </header>
  );
}