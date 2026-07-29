"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type PredictionOption = {
  id: string;
  market_id: string;
  label: string;
};

type PredictionMarket = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  closes_at: string | null;
  winning_option: string | null;
  created_at: string;
  prediction_options: PredictionOption[];
};

type WalletResponse = {
  balance?: number;
  error?: string;
};

export default function PublicPredictionsPage() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [placingBetFor, setPlacingBetFor] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const openMarkets = useMemo(
    () =>
      markets.filter((market) => {
        if (market.status !== "open") return false;
        if (!market.closes_at) return true;
        return new Date(market.closes_at).getTime() > Date.now();
      }),
    [markets]
  );

  const closedMarkets = useMemo(
    () =>
      markets.filter((market) => {
        if (market.status !== "open") return true;
        if (!market.closes_at) return false;
        return new Date(market.closes_at).getTime() <= Date.now();
      }),
    [markets]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [marketsResponse, walletResponse] = await Promise.all([
        fetch("/api/prediction-markets", { cache: "no-store" }),
        fetch("/api/wallet", { cache: "no-store" }),
      ]);

      const marketsData = await marketsResponse.json();
      const walletData = (await walletResponse.json()) as WalletResponse;

      if (!marketsResponse.ok) {
        throw new Error(
          marketsData.error ?? "Failed to load prediction markets."
        );
      }

      setMarkets(Array.isArray(marketsData) ? marketsData : []);

      if (walletResponse.ok && typeof walletData.balance === "number") {
        setWalletBalance(walletData.balance);
      } else {
        setWalletBalance(null);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load prediction markets."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function placeBet(marketId: string) {
    if (placingBetFor) return;

    setMessage("");
    setError("");

    const optionId = selectedOptions[marketId];
    const amount = Number(betAmounts[marketId]);

    if (!optionId) {
      setError("Choose an option before placing your bet.");
      return;
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Enter a valid whole-number bet amount.");
      return;
    }

    if (walletBalance !== null && amount > walletBalance) {
      setError("You do not have enough NE Coin for that bet.");
      return;
    }

    setPlacingBetFor(marketId);

    try {
      const response = await fetch("/api/place-bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marketId,
          optionId,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to place bet.");
      }

      setMessage(`Bet placed successfully for ${amount.toLocaleString()} NE Coin.`);
      setBetAmounts((current) => ({ ...current, [marketId]: "" }));

      await loadData();
    } catch (betError) {
      setError(
        betError instanceof Error ? betError.message : "Failed to place bet."
      );
    } finally {
      setPlacingBetFor(null);
    }
  }

  function formatClosingTime(value: string | null) {
    if (!value) return "No closing time";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  return (
    <main className="min-h-screen bg-[#070707] px-5 py-8 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-purple-400">
              New Era Prediction Market
            </p>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Put Your NE Coin on It
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
              Pick a side, enter your wager, and earn NE Coin when you are right.
            </p>
          </div>

          <div className="flex w-fit items-center gap-3 rounded-2xl border border-amber-400/20 bg-[#121212] px-4 py-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-full">
              <Image
                src="/ne-coin.png"
                alt="NE Coin"
                fill
                className="object-contain"
                sizes="44px"
                priority
              />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Balance
              </p>

              <p className="text-2xl font-black">
                {walletBalance === null
                  ? "----"
                  : walletBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-bold text-emerald-300">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
            {error}
          </div>
        ) : null}

        <section>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-400">
              Live Markets
            </p>
            <h2 className="mt-2 text-2xl font-black">Open for Betting</h2>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-[#111111] p-10 text-center text-zinc-400">
              Loading markets...
            </div>
          ) : openMarkets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#111111] p-10 text-center">
              <p className="text-lg font-black">No open markets right now.</p>
              <p className="mt-2 text-sm text-zinc-500">
                Check back after a commissioner creates one.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {openMarkets.map((market) => (
                <article
                  key={market.id}
                  className="rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-6"
                >
                  <div className="mb-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
                        Open
                      </span>

                      <span className="text-xs font-bold text-zinc-500">
                        Closes {formatClosingTime(market.closes_at)}
                      </span>
                    </div>

                    <h3 className="mt-4 text-2xl font-black">{market.title}</h3>

                    {market.description ? (
                      <p className="mt-2 text-sm text-zinc-400">
                        {market.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3">
                    {(market.prediction_options ?? []).map((option) => {
                      const selected =
                        selectedOptions[market.id] === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setSelectedOptions((current) => ({
                              ...current,
                              [market.id]: option.id,
                            }))
                          }
                          className={`rounded-2xl border px-4 py-4 text-left text-sm font-black transition ${
                            selected
                              ? "border-purple-500 bg-purple-500/15 text-purple-200"
                              : "border-white/10 bg-[#1a1a1a] text-white hover:border-purple-500/50"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span>{option.label}</span>
                            <span
                              className={`h-4 w-4 rounded-full border ${
                                selected
                                  ? "border-purple-400 bg-purple-500"
                                  : "border-zinc-600"
                              }`}
                            />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={betAmounts[market.id] ?? ""}
                      onChange={(event) =>
                        setBetAmounts((current) => ({
                          ...current,
                          [market.id]: event.target.value,
                        }))
                      }
                      placeholder="Bet amount"
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-purple-500"
                    />

                    <button
                      type="button"
                      onClick={() => void placeBet(market.id)}
                      disabled={placingBetFor === market.id}
                      className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black uppercase tracking-wider hover:bg-purple-500 disabled:opacity-60"
                    >
                      {placingBetFor === market.id
                        ? "Placing..."
                        : "Place Bet"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {closedMarkets.length > 0 ? (
          <section className="mt-10">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                Previous Markets
              </p>
              <h2 className="mt-2 text-2xl font-black">Closed & Graded</h2>
            </div>

            <div className="grid gap-4">
              {closedMarkets.map((market) => (
                <article
                  key={market.id}
                  className="rounded-2xl border border-white/10 bg-[#101010] p-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-black">{market.title}</h3>
                      <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">
                        {market.status}
                      </p>
                    </div>

                    {market.winning_option ? (
                      <span className="rounded-full bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase text-emerald-300">
                        Winner Selected
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-500/10 px-3 py-2 text-xs font-black uppercase text-zinc-400">
                        Awaiting Result
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}