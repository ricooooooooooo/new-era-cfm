import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppLayout from "@/app/components/layout/AppLayout";
import { supabaseAdmin } from "@/lib/supabase-admin";

import AdvanceCountdown from "@/app/components/AdvanceCountdown";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SessionUser = {
  id: string;
  username: string;
  displayName: string;
};

async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const value = store.get("gold_jacket_discord_user")?.value;

  if (!value) return null;

  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as SessionUser;
  } catch {
    return null;
  }
}

export default async function OwnerHomePage() {
  const user = await getSessionUser();

  if (!user) redirect("/discord-connect");

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("display_name")
    .eq("discord_id", user.id)
    .maybeSingle();

  const displayName = member?.display_name ?? user.displayName;

  return (
    <AppLayout>
      <main className="min-h-screen bg-[#050505] text-[#f7f2e7]">
        <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-5 sm:px-5 sm:pb-8 sm:pt-6 lg:px-7">
          <section className="relative overflow-hidden rounded-[24px] border border-[#d7b56d]/16 bg-[radial-gradient(circle_at_5%_0%,rgba(214,177,90,.14),transparent_21rem),linear-gradient(135deg,#11100d,#070807)] px-5 py-4 shadow-[0_20px_65px_rgba(0,0,0,.28)] sm:px-6 sm:py-5">
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[6.5rem] font-black leading-none text-[#e8c978]/[0.025] sm:text-[8rem]">
              GJ
            </div>

            <div className="relative flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.27em] text-[#cfae5c] sm:text-[10px]">
                  Gold Jacket • Season One
                </p>
                <h1 className="mt-1.5 truncate text-[1.75rem] font-black tracking-[-0.055em] text-white sm:text-[2.15rem]">
                  Welcome back, {displayName}.
                </h1>
              </div>

              <AdvanceCountdown />
            </div>
          </section>

          <section className="mt-3 grid gap-3 sm:grid-cols-[1.03fr_.97fr]">
            <Link
              href="/my-game"
              className="group relative min-h-[200px] overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_5%_0%,rgba(214,177,90,.085),transparent_17rem),linear-gradient(145deg,#0c0c0b,#070707)] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#d7b56d]/30 sm:min-h-[208px] sm:p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#d1ae58]">
                  Your Matchup
                </p>
                <span className="text-zinc-700 transition group-hover:translate-x-1 group-hover:text-[#e8ca7e]">
                  →
                </span>
              </div>

              <div className="mt-6">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-zinc-600">
                  Gold Jacket CFM
                </p>
                <h2 className="mt-2 max-w-[22rem] text-2xl font-black tracking-[-0.045em] text-white sm:text-[1.65rem]">
                  League connection pending
                </h2>
                <p className="mt-2 max-w-[25rem] text-xs font-medium leading-5 text-zinc-500">
                  Your team and opponent will appear here as soon as the new Madden league is linked.
                </p>
              </div>

              <div className="absolute bottom-5 left-5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.13em] text-zinc-600">
                Waiting for league sync
              </div>
            </Link>

            <Link
              href="/gold-jackets"
              className="gold-jacket-home-card group relative min-h-[200px] overflow-hidden rounded-[24px] border border-[#d7b56d]/30 bg-[#080704] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#efd37f]/55 sm:min-h-[208px] sm:p-5"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-cover bg-[position:72%_42%] opacity-[0.74] transition duration-500 group-hover:scale-[1.025] group-hover:opacity-[0.84]"
                style={{
                  backgroundImage: 'url("/gold-jacket-legends-2026.png")',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,4,.99)_0%,rgba(6,6,5,.96)_34%,rgba(7,6,4,.78)_57%,rgba(4,4,3,.22)_100%)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_22%,rgba(240,199,103,.18),transparent_13rem)]"
              />

              <div className="relative z-10 max-w-[59%]">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#e1bd64]">
                  Your Gold Jacket
                </p>

                <h2 className="mt-6 text-[1.6rem] font-black tracking-[-0.05em] text-white sm:text-[1.75rem]">
                  Selection Pending
                </h2>
                <p className="mt-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-[#e3c36f]">
                  70 OVR • Superstar • Age 20
                </p>
                <p className="mt-3 max-w-[17rem] text-[11px] leading-[1.45rem] text-zinc-400">
                  One franchise legend. Reborn at 20. Build the career from scratch.
                </p>
              </div>

              <p className="absolute bottom-5 left-5 z-10 text-[8px] font-black uppercase tracking-[0.15em] text-[#e2c36f] transition group-hover:translate-x-1">
                View Gold Jackets →
              </p>
            </Link>
          </section>

          <section className="mt-5">
            <div className="mb-2.5 flex items-end justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.23em] text-[#8d7644]">
                  Around Gold Jacket
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-white sm:text-[1.35rem]">
                  Happening now
                </h2>
              </div>
              <Link
                href="/league"
                className="text-[8px] font-black uppercase tracking-[0.13em] text-zinc-600 transition hover:text-[#e0c16d]"
              >
                League →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Link
                href="/media/game-of-the-week"
                className="group min-h-[148px] rounded-[19px] border border-[#d7b56d]/22 bg-[linear-gradient(145deg,rgba(214,177,90,.055),rgba(255,255,255,.018))] p-4 transition hover:border-[#e6c875]/45"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">🔥</span>
                  <span className="text-[7px] font-black uppercase tracking-[0.15em] text-[#cfae59]">
                    GOTW
                  </span>
                </div>
                <p className="mt-4 text-sm font-black text-white sm:text-[15px]">
                  Game of the Week
                </p>
                <p className="mt-2 text-[10px] leading-4 text-zinc-600">
                  Selection opens with Week 1.
                </p>
              </Link>

              <Link
                href="/media/player-of-the-week"
                className="group min-h-[148px] rounded-[19px] border border-white/10 bg-white/[0.025] p-4 transition hover:border-[#d7b56d]/28"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">🏆</span>
                  <span className="text-[7px] font-black uppercase tracking-[0.15em] text-zinc-600">
                    POTW
                  </span>
                </div>
                <p className="mt-4 text-sm font-black text-white sm:text-[15px]">
                  Players of the Week
                </p>
                <p className="mt-2 text-[10px] leading-4 text-zinc-600">
                  Awards begin after the first games.
                </p>
              </Link>

              <Link
                href="/gold-jackets"
                className="group min-h-[148px] rounded-[19px] border border-[#d7b56d]/17 bg-[linear-gradient(145deg,rgba(214,177,90,.04),rgba(255,255,255,.018))] p-4 transition hover:border-[#e6c875]/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">🧥</span>
                  <span className="text-[7px] font-black uppercase tracking-[0.15em] text-[#b89443]">
                    Jacket Watch
                  </span>
                </div>
                <p className="mt-4 text-sm font-black text-white sm:text-[15px]">
                  The Legends Return
                </p>
                <p className="mt-2 text-[10px] leading-4 text-zinc-600">
                  32 franchises. 32 legends.
                </p>
              </Link>

              <Link
                href="/media/power-rankings"
                className="group min-h-[148px] rounded-[19px] border border-white/10 bg-white/[0.025] p-4 transition hover:border-[#d7b56d]/28"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">📈</span>
                  <span className="text-[7px] font-black uppercase tracking-[0.15em] text-zinc-600">
                    Rankings
                  </span>
                </div>
                <p className="mt-4 text-sm font-black text-white sm:text-[15px]">
                  Power Rankings
                </p>
                <p className="mt-2 text-[10px] leading-4 text-zinc-600">
                  First rankings drop after Week 1.
                </p>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </AppLayout>
  );
}

