import Image from "next/image";
import Link from "next/link";

import AppLayout from "@/app/components/layout/AppLayout";
import { getFantasySignupState } from "@/lib/fantasy-signups";

import FantasySignupForm from "./FantasySignupForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FantasyPage() {
  const signupState = await getFantasySignupState();
  const signupCount = signupState.signupCount;
  const sleeperUrl = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_URL?.trim() || "";
  const spotsLeft = Math.max(0, 10 - signupCount);

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-7rem)] bg-[radial-gradient(circle_at_50%_-10%,rgba(215,179,90,.14),transparent_32rem),#080807] px-4 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-[2.2rem] border border-[#d7b35a]/25 bg-[linear-gradient(135deg,#11100c,#080807_68%)] p-6 sm:p-9 lg:p-11">
            <div className="pointer-events-none absolute -right-24 -top-24 h-[30rem] w-[30rem] opacity-20">
              <Image src="/gold-jacket-logo.png" alt="" fill priority sizes="480px" className="object-contain" />
            </div>

            <div className="relative max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">
                Gold Jacket Fantasy
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-[-0.065em] sm:text-6xl">
                Fantasy without the extra bullshit.
              </h1>

              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-zinc-400 sm:text-lg">
                10-Team PPR on Sleeper. $10 buy-in. One chat, one league, and a clean signup that takes about thirty seconds.
              </p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                {[
                  "10-Team",
                  "PPR",
                  "$10 Buy-In",
                  "Sleeper",
                ].map((label) => (
                  <span key={label} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-300">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300/70">League Status</p>

              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-black tracking-[-0.06em] text-white">{signupCount}</span>
                <span className="pb-1 text-lg font-black text-zinc-600">/ 10</span>
              </div>
              <p className="mt-2 text-sm font-bold text-zinc-500">
                {spotsLeft === 0 ? "League is currently full." : `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} still open.`}
              </p>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[#e7c66d]" style={{ width: `${signupCount * 10}%` }} />
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">Entry</p>
                  <p className="mt-2 text-xl font-black">$10</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">Scoring</p>
                  <p className="mt-2 text-xl font-black">PPR</p>
                </div>
              </div>

              {sleeperUrl ? (
                <Link
                  href={sleeperUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 flex w-full items-center justify-center rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 px-5 py-3.5 text-sm font-black text-violet-200 transition hover:bg-[#7c3aed]/20"
                >
                  Open League In Sleeper ↗
                </Link>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-center text-xs font-bold text-zinc-600">
                  Sleeper league link is being added.
                </div>
              )}
            </div>

            <FantasySignupForm />
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
