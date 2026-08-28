"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Wallet = {
  balance: number;
  lifetime_won: number;
  lifetime_wagered: number;
};

type Transaction = {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
};

type ClaimStatus = {
  canClaim: boolean;
  nextClaimAt: string | null;
  remainingMs: number;
  reward: number;
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [walletResponse, transactionsResponse, claimResponse] =
        await Promise.all([
          fetch("/api/wallet", { cache: "no-store" }),
          fetch("/api/wallet/transactions", { cache: "no-store" }),
          fetch("/api/wallet/daily-claim", { cache: "no-store" }),
        ]);

      const walletData = await walletResponse.json();
      const transactionData = await transactionsResponse.json();
      const claimData = await claimResponse.json();

      if (!walletResponse.ok) {
        throw new Error(walletData.error ?? "Failed to load wallet.");
      }

      if (!transactionsResponse.ok) {
        throw new Error(
          transactionData.error ?? "Failed to load transaction history.",
        );
      }

      if (!claimResponse.ok) {
        throw new Error(claimData.error ?? "Failed to load daily claim.");
      }

      setWallet(walletData);
      setTransactions(Array.isArray(transactionData) ? transactionData : []);
      setClaimStatus(claimData);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load wallet.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMs = useMemo(() => {
    if (!claimStatus?.nextClaimAt) return 0;
    return Math.max(0, new Date(claimStatus.nextClaimAt).getTime() - now);
  }, [claimStatus?.nextClaimAt, now]);

  const canClaim = claimStatus?.canClaim || remainingMs === 0;

  function formatCountdown(milliseconds: number) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function claimDailyReward() {
    if (claiming || !canClaim) return;

    setClaiming(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/wallet/daily-claim", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setClaimStatus(data);
        }

        throw new Error(data.error ?? "Failed to claim daily reward.");
      }

      setNotice(`You claimed +${data.amount} NE Coin.`);
      await load();
    } catch (claimError) {
      setError(
        claimError instanceof Error
          ? claimError.message
          : "Failed to claim daily reward.",
      );
    } finally {
      setClaiming(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] px-5 py-8 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-purple-400">
              Gold Jacket Economy
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              My Wallet
            </h1>
            <p className="mt-3 text-zinc-400">
              Every wager, payout, and reward in one place.
            </p>
          </div>

          <Link
            href="/leaderboard"
            className="w-fit rounded-2xl border border-purple-400/25 bg-purple-500/10 px-5 py-3 text-sm font-black text-purple-200"
          >
            View Leaderboard
          </Link>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 font-bold text-red-300">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 font-bold text-emerald-300">
            {notice}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#111111] p-10 text-center text-zinc-400">
            Loading wallet...
          </div>
        ) : wallet ? (
          <>
            <section className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-[#111111] p-6">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16">
                    <Image
                      src="/ne-coin.png"
                      alt="NE Coin"
                      fill
                      className="object-contain"
                      sizes="64px"
                      priority
                    />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300/70">
                      Current Balance
                    </p>
                    <p className="mt-1 text-4xl font-black">
                      {Number(wallet.balance).toLocaleString()}
                    </p>
                    <p className="text-xs font-bold text-zinc-500">NE Coin</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 to-[#111111] p-6 lg:col-span-2">
                <div className="flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300/70">
                      Daily Reward
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      +{claimStatus?.reward ?? 25} NE Coin
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {canClaim
                        ? "Your daily reward is ready."
                        : `Next claim in ${formatCountdown(remainingMs)}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void claimDailyReward()}
                    disabled={!canClaim || claiming}
                    className="rounded-2xl bg-purple-500 px-6 py-4 text-sm font-black text-white shadow-[0_14px_35px_rgba(168,85,247,0.25)] transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
                  >
                    {claiming
                      ? "Claiming..."
                      : canClaim
                        ? "Claim Daily"
                        : formatCountdown(remainingMs)}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#111111] p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                  Lifetime Won
                </p>
                <p className="mt-3 text-3xl font-black text-emerald-300">
                  +{Number(wallet.lifetime_won).toLocaleString()}
                </p>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                  Lifetime Wagered
                </p>
                <p className="mt-2 text-2xl font-black">
                  {Number(wallet.lifetime_wagered).toLocaleString()}
                </p>
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-purple-400">
                    Ledger
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Recent Activity</h2>
                </div>

                <button
                  type="button"
                  onClick={() => void load()}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-300"
                >
                  Refresh
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-zinc-500">
                  No transactions yet.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {transactions.map((transaction) => {
                    const positive = Number(transaction.amount) > 0;

                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-4 py-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">
                            {transaction.description}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>

                        <p
                          className={`shrink-0 text-lg font-black ${
                            positive ? "text-emerald-300" : "text-red-300"
                          }`}
                        >
                          {positive ? "+" : ""}
                          {Number(transaction.amount).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
