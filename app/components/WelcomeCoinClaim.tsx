"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ClaimStatus = {
  success: boolean;
  authenticated?: boolean;
  canClaim?: boolean;
  reward?: number;
  balance?: number;
};

export default function WelcomeCoinClaim() {
  const [open, setOpen] = useState(false);
  const [reward, setReward] = useState(100);
  const [claiming, setClaiming] = useState(false);
  const [claimedBalance, setClaimedBalance] =
    useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkClaim() {
      try {
        const response = await fetch(
          "/api/wallet/welcome-claim",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) return;

        const data =
          (await response.json()) as ClaimStatus;

        if (!active) return;

        if (
          data.authenticated &&
          data.canClaim
        ) {
          setReward(Number(data.reward ?? 100));
          setOpen(true);
        }
      } catch {
        // Never block the website if claim status fails.
      }
    }

    void checkClaim();

    return () => {
      active = false;
    };
  }, []);

  async function claim() {
    if (claiming) return;

    setClaiming(true);
    setError("");

    try {
      const response = await fetch(
        "/api/wallet/welcome-claim",
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to claim NE Coin.",
        );
      }

      setClaimedBalance(
        Number(data.balance ?? reward),
      );
    } catch (claimError) {
      setError(
        claimError instanceof Error
          ? claimError.message
          : "Unable to claim NE Coin.",
      );
    } finally {
      setClaiming(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 px-5 backdrop-blur-xl">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-purple-400/25 bg-[#0b0b0d] p-7 text-center shadow-[0_30px_120px_rgba(126,34,206,0.35)] sm:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-purple-600/20 to-transparent" />

        <div className="relative mx-auto h-24 w-24">
          <Image
            src="/ne-coin.png"
            alt="NE Coin"
            fill
            priority
            sizes="96px"
            className="object-contain"
          />
        </div>

        {claimedBalance === null ? (
          <>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.32em] text-purple-300">
              Welcome to Gold Jacket
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white">
              Claim Your NE Coin
            </h2>

            <p className="mt-4 text-zinc-400">
              Every owner starts from the same spot.
              Bet smart, win predictions, claim daily rewards,
              and grind toward franchise upgrades.
            </p>

            <div className="mx-auto mt-7 max-w-xs rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300/70">
                Starter Claim
              </p>

              <p className="mt-2 text-4xl font-black text-white">
                +{reward}
              </p>

              <p className="text-sm font-bold text-amber-300">
                NE Coin
              </p>
            </div>

            <p className="mt-5 text-xs leading-5 text-zinc-600">
              The cheapest franchise upgrade costs 300 NE.
              Your starter claim alone cannot purchase an upgrade.
            </p>

            {error ? (
              <p className="mt-4 text-sm font-bold text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void claim()}
              disabled={claiming}
              className="mt-7 w-full rounded-2xl bg-purple-600 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_16px_45px_rgba(147,51,234,0.3)] transition hover:bg-purple-500 disabled:opacity-50"
            >
              {claiming
                ? "Claiming..."
                : `Claim ${reward} NE Coin`}
            </button>
          </>
        ) : (
          <>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
              Claim Complete
            </p>

            <h2 className="mt-3 text-4xl font-black text-white">
              You&apos;re In.
            </h2>

            <p className="mt-4 text-zinc-400">
              Your Gold Jacket economy is active.
            </p>

            <div className="mt-7 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">
                Current Balance
              </p>

              <p className="mt-2 text-4xl font-black">
                {claimedBalance.toLocaleString()} NE
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-7 w-full rounded-2xl bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.16em] !text-black"
            >
              Enter Gold Jacket
            </button>
          </>
        )}
      </div>
    </div>
  );
}
