"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type LeaderboardEntry = {
  rank: number;
  discord_id: string;
  name: string;
  balance: number;
  lifetime_won: number;
  lifetime_wagered: number;
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/wallet/leaderboard", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load leaderboard.");
        }

        setEntries(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load leaderboard.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const rankLabel = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <main className="min-h-screen bg-[#070707] px-5 py-8 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-purple-400">
              Gold Jacket Economy
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              NE Coin Leaderboard
            </h1>
            <p className="mt-3 text-zinc-400">
              The richest owners in Gold Jacket.
            </p>
          </div>

          <Link
            href="/wallet"
            className="w-fit rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-3 text-sm font-black text-amber-200"
          >
            My Wallet
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 font-bold text-red-300">
            {error}
          </div>
        ) : loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#111111] p-10 text-center text-zinc-400">
            Loading leaderboard...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#111111] p-10 text-center text-zinc-500">
            No wallets have been created yet.
          </div>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#111111]">
            <div className="grid grid-cols-[62px_1fr_auto] gap-3 border-b border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 sm:grid-cols-[80px_1fr_150px_150px] sm:px-6">
              <span>Rank</span>
              <span>Owner</span>
              <span className="text-right">Balance</span>
              <span className="hidden text-right sm:block">Lifetime Won</span>
            </div>

            <div className="divide-y divide-white/10">
              {entries.map((entry) => (
                <div
                  key={entry.discord_id}
                  className="grid grid-cols-[62px_1fr_auto] items-center gap-3 px-4 py-5 sm:grid-cols-[80px_1fr_150px_150px] sm:px-6"
                >
                  <span className="text-lg font-black">
                    {rankLabel(entry.rank)}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate font-black">{entry.name}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Wagered {entry.lifetime_wagered.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 font-black text-amber-200">
                    <div className="relative h-6 w-6">
                      <Image
                        src="/ne-coin.png"
                        alt=""
                        fill
                        className="object-contain"
                        sizes="24px"
                      />
                    </div>
                    {entry.balance.toLocaleString()}
                  </div>

                  <span className="hidden text-right font-black text-emerald-300 sm:block">
                    +{entry.lifetime_won.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
