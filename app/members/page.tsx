"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/app/components/layout/AppLayout";

type Member = {
  id: string;
  discord_id: string;
  discord_username: string | null;
  display_name: string | null;
  avatar_hash: string | null;
  role: string | null;
  is_staff: boolean;
  is_active: boolean;
  first_connected_at: string | null;
  last_seen_at: string | null;
};

type MembersResponse = {
  success: boolean;
  members?: Member[];
  error?: string;
};

function getMemberName(member: Member) {
  return (
    member.display_name?.trim() ||
    member.discord_username?.trim() ||
    "Gold Jacket Member"
  );
}

function getAvatarUrl(member: Member) {
  if (!member.avatar_hash) {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  return `https://cdn.discordapp.com/avatars/${member.discord_id}/${member.avatar_hash}.png?size=256`;
}

function getActivity(member: Member) {
  if (!member.is_active) {
    return {
      label: "Inactive",
      online: false,
    };
  }

  if (!member.last_seen_at) {
    return {
      label: "No recent activity",
      online: false,
    };
  }

  const lastSeenTime = new Date(member.last_seen_at).getTime();

  if (Number.isNaN(lastSeenTime)) {
    return {
      label: "Activity unavailable",
      online: false,
    };
  }

  const difference = Math.max(0, Date.now() - lastSeenTime);
  const minutes = Math.floor(difference / 60_000);

  if (minutes < 5) {
    return {
      label: "Online",
      online: true,
    };
  }

  if (minutes < 60) {
    return {
      label: `Active ${minutes}m ago`,
      online: false,
    };
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return {
      label: `Active ${hours}h ago`,
      online: false,
    };
  }

  const days = Math.floor(hours / 24);

  return {
    label: `Active ${days}d ago`,
    online: false,
  };
}

function formatJoinedDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function MembersLoading() {
  return (
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[310px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.035]"
        />
      ))}
    </div>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      try {
        const response = await fetch("/api/members", {
          cache: "no-store",
        });

        const data = (await response.json()) as MembersResponse;

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load members.");
        }

        if (active) {
          setMembers(data.members ?? []);
          setErrorMessage("");
        }
      } catch (error) {
        console.error("Failed to load members page:", error);

        if (active) {
          setMembers([]);
          setErrorMessage(
            "The member directory could not be loaded right now.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      active = false;
    };
  }, []);

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return members;
    }

    return members.filter((member) => {
      const searchableValues = [
        member.display_name,
        member.discord_username,
        member.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableValues.includes(normalizedSearch);
    });
  }, [members, search]);

  const activeMembers = members.filter(
    (member) => member.is_active,
  ).length;

  const staffMembers = members.filter(
    (member) => member.is_staff,
  ).length;

  return (
    <AppLayout>
      <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[760px] -translate-x-1/2 bg-[radial-gradient(circle,rgba(126,34,206,0.15),transparent_68%)]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.035] to-transparent p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-purple-300">
                  Gold Jacket Network
                </p>

                <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
                  League Members
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
                  Find every connected owner in GOLD JACKET and open
                  their league profile, activity history, badges,
                  and future AI scouting report.
                </p>
              </div>

              <div className="grid w-full grid-cols-3 gap-2 sm:gap-3 lg:w-auto lg:min-w-[390px]">
                <div className="flex h-24 min-w-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-2 text-center">
                  <p className="text-2xl font-black leading-none text-white">
                    {members.length}
                  </p>

                  <p className="mt-2 w-full truncate text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500 sm:text-[9px] sm:tracking-[0.18em]">
                    Members
                  </p>
                </div>

                <div className="flex h-24 min-w-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-2 text-center">
                  <p className="text-2xl font-black leading-none text-white">
                    {activeMembers}
                  </p>

                  <p className="mt-2 w-full truncate text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500 sm:text-[9px] sm:tracking-[0.18em]">
                    Active
                  </p>
                </div>

                <div className="flex h-24 min-w-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-2 text-center">
                  <p className="text-2xl font-black leading-none text-white">
                    {staffMembers}
                  </p>

                  <p className="mt-2 w-full truncate text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500 sm:text-[9px] sm:tracking-[0.18em]">
                    Staff
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600"
              >
                <path
                  d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="search"
                placeholder="Search by name, username, or role..."
                className="w-full rounded-2xl border border-white/10 bg-black/25 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-400/40 focus:bg-white/[0.045]"
              />
            </div>

            <p className="px-1 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              {filteredMembers.length}{" "}
              {filteredMembers.length === 1 ? "result" : "results"}
            </p>
          </div>

          <div className="mt-7">
            {loading ? (
              <MembersLoading />
            ) : errorMessage ? (
              <div className="rounded-3xl border border-red-400/20 bg-red-400/[0.05] p-10 text-center">
                <h2 className="text-2xl font-black text-white">
                  Members unavailable
                </h2>

                <p className="mt-3 text-zinc-400">
                  {errorMessage}
                </p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-10 text-center">
                <h2 className="text-2xl font-black text-white">
                  No members found
                </h2>

                <p className="mt-3 text-zinc-500">
                  Try searching with a different name or username.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {filteredMembers.map((member) => {
                  const name = getMemberName(member);
                  const activity = getActivity(member);

                  return (
                    <Link
                      key={member.id}
                      href={`/members/${member.discord_id}`}
                      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.065] to-white/[0.02] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-purple-300/30 hover:shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
                    >
                      <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 bg-[radial-gradient(circle,rgba(168,85,247,0.12),transparent_70%)] opacity-70 transition group-hover:opacity-100" />

                      <div className="relative">
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            <img
                              src={getAvatarUrl(member)}
                              alt={`${name} Discord avatar`}
                              className="h-[72px] w-[72px] rounded-2xl border border-white/10 object-cover shadow-[0_14px_35px_rgba(0,0,0,0.35)]"
                            />

                            <span
                              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-[#101112] ${
                                activity.online
                                  ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]"
                                  : "bg-zinc-600"
                              }`}
                            />
                          </div>

                          <div className="min-w-0 flex-1 pt-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h2 className="truncate text-xl font-black tracking-[-0.035em] text-white">
                                  {name}
                                </h2>

                                <p className="mt-1 truncate text-sm text-zinc-500">
                                  @{member.discord_username ?? "unknown"}
                                </p>
                              </div>

                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="mt-1 h-5 w-5 shrink-0 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-purple-200"
                              >
                                <path
                                  d="M5 12h14m-6-6 6 6-6 6"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                {member.role || "Member"}
                              </span>

                              {member.is_staff && (
                                <span className="rounded-full border border-purple-300/20 bg-purple-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-purple-200">
                                  Staff
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-7 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3.5">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                              Activity
                            </p>

                            <p
                              className={`mt-2 truncate text-sm font-bold ${
                                activity.online
                                  ? "text-emerald-300"
                                  : "text-zinc-300"
                              }`}
                            >
                              {activity.label}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3.5">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                              Joined
                            </p>

                            <p className="mt-2 truncate text-sm font-bold text-zinc-300">
                              {formatJoinedDate(
                                member.first_connected_at,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-300/15 bg-amber-300/[0.07] text-xs">
                              ★
                            </span>

                            <div>
                              <p className="text-[9px] font-black uppercase tracking-[0.17em] text-zinc-600">
                                Badge
                              </p>

                              <p className="mt-0.5 text-xs font-bold text-zinc-300">
                                Early Supporter
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-200">
                            View profile
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}