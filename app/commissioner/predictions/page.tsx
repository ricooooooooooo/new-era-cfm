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
};

export default function CommissionerPredictionsPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [creating, setCreating] = useState(false);
  const [gradingMarketId, setGradingMarketId] = useState<string | null>(null);
  const [deletingMarketId, setDeletingMarketId] = useState<string | null>(null);
  const [selectedWinners, setSelectedWinners] = useState<Record<string, string>>(
    {}
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const cleanOptions = useMemo(
    () => options.map((option) => option.trim()).filter(Boolean),
    [options]
  );

  const loadMarkets = useCallback(async () => {
    setLoadingMarkets(true);

    try {
      const response = await fetch("/api/prediction-markets", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load prediction markets.");
      }

      setMarkets(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load prediction markets."
      );
    } finally {
      setLoadingMarkets(false);
    }
  }, []);

  const loadWallet = useCallback(async () => {
    try {
      const response = await fetch("/api/wallet", {
        cache: "no-store",
      });

      const data = (await response.json()) as WalletResponse;

      if (response.ok && typeof data.balance === "number") {
        setWalletBalance(data.balance);
      }
    } catch {
      setWalletBalance(null);
    }
  }, []);

  useEffect(() => {
    void loadMarkets();
    void loadWallet();
  }, [loadMarkets, loadWallet]);

  function updateOption(index: number, value: string) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? value : option
      )
    );
  }

  function addOption() {
    setOptions((current) => [...current, ""]);
  }

  function removeOption(index: number) {
    setOptions((current) => {
      if (current.length <= 2) return current;
      return current.filter((_, optionIndex) => optionIndex !== index);
    });
  }

  async function createMarket() {
    if (creating) return;

    setMessage("");
    setError("");

    if (!title.trim()) {
      setError("Enter a market title.");
      return;
    }

    if (cleanOptions.length < 2) {
      setError("Add at least two valid options.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/prediction-markets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          closesAt: closesAt || null,
          options: cleanOptions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create market.");
      }

      setTitle("");
      setDescription("");
      setClosesAt("");
      setOptions(["", ""]);
      setMessage("Market created successfully.");

      await loadMarkets();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create market."
      );
    } finally {
      setCreating(false);
    }
  }

  async function gradeMarket(marketId: string) {
    if (gradingMarketId) return;

    const optionId = selectedWinners[marketId];

    setMessage("");
    setError("");

    if (!optionId) {
      setError("Choose the winning option first.");
      return;
    }

    const confirmed = window.confirm(
      "Grade this market and immediately pay every winning bettor?"
    );

    if (!confirmed) return;

    setGradingMarketId(marketId);

    try {
      const response = await fetch("/api/grade-market", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marketId,
          optionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to grade market.");
      }

      setMessage(
        `Market graded. ${data.paidBets ?? 0} winning bets paid for ${Number(
          data.totalPaid ?? 0
        ).toLocaleString()} NE Coin.`
      );

      await Promise.all([loadMarkets(), loadWallet()]);
    } catch (gradeError) {
      setError(
        gradeError instanceof Error
          ? gradeError.message
          : "Failed to grade market."
      );
    } finally {
      setGradingMarketId(null);
    }
  }


  async function deleteMarket(market: PredictionMarket) {
    if (deletingMarketId) return;

    const confirmed = window.confirm(
      market.status === "graded"
        ? "Delete this prediction permanently?\n\nThis cannot be undone."
        : "Delete this prediction?\n\nAll bets will be refunded automatically.\n\nThis cannot be undone."
    );

    if (!confirmed) return;

    setDeletingMarketId(market.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/delete-market", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marketId: market.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete market.");
      }

      setMarkets((current) =>
        current.filter((existingMarket) => existingMarket.id !== market.id)
      );

      setSelectedWinners((current) => {
        const next = { ...current };
        delete next[market.id];
        return next;
      });

      setMessage(
        Number(data.totalRefunded ?? 0) > 0
          ? `Prediction deleted. ${Number(
              data.totalRefunded
            ).toLocaleString()} NE Coin refunded.`
          : "Prediction deleted successfully."
      );

      await loadWallet();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete market."
      );
    } finally {
      setDeletingMarketId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] px-5 py-8 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-purple-400">
              Commissioner Control
            </p>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Prediction Markets
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
              Create markets, choose winners, and automatically pay members in
              NE Coin.
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
                Your Balance
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

        <section className="rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-400">
            New Market
          </p>
          <h2 className="mt-2 text-2xl font-black">Create a Prediction</h2>

          <div className="mt-6 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-zinc-300">
                Market title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Who wins Ravens vs. Chiefs?"
                className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-purple-500"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-zinc-300">
                Description
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add any details members should know."
                rows={3}
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-purple-500"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-zinc-300">
                Betting closes
              </span>
              <input
                type="datetime-local"
                value={closesAt}
                onChange={(event) => setClosesAt(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-purple-500"
              />
            </label>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-300">
                  Betting options
                </span>
                <button
                  type="button"
                  onClick={addOption}
                  className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-black text-purple-300"
                >
                  + Add Option
                </button>
              </div>

              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={option}
                    onChange={(event) =>
                      updateOption(index, event.target.value)
                    }
                    placeholder={`Option ${index + 1}`}
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-purple-500"
                  />

                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={options.length <= 2}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 font-black text-zinc-400 disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={createMarket}
              disabled={creating}
              className="rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black uppercase tracking-wider hover:bg-purple-500 disabled:opacity-60"
            >
              {creating ? "Creating Market..." : "Create Market"}
            </button>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-400">
                Market Control
              </p>
              <h2 className="mt-2 text-2xl font-black">Existing Markets</h2>
            </div>

            <button
              type="button"
              onClick={() => void loadMarkets()}
              disabled={loadingMarkets}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-300 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loadingMarkets ? (
            <div className="rounded-3xl border border-white/10 bg-[#111111] p-8 text-center text-zinc-400">
              Loading markets...
            </div>
          ) : markets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#111111] p-10 text-center">
              <p className="text-lg font-black">No prediction markets yet.</p>
              <p className="mt-2 text-sm text-zinc-500">
                Create your first test market above.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {markets.map((market) => {
                const isGraded = market.status === "graded";
                const isGrading = gradingMarketId === market.id;

                return (
                  <article
                    key={market.id}
                    className="rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-black">
                            {market.title}
                          </h3>
                          <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-purple-300">
                            {market.status}
                          </span>
                        </div>

                        {market.description ? (
                          <p className="mt-2 text-sm text-zinc-400">
                            {market.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="w-full max-w-md space-y-3">
                        {!isGraded ? (
                          <div className="rounded-2xl border border-white/10 bg-[#181818] p-4">
                            <select
                              value={selectedWinners[market.id] ?? ""}
                              onChange={(event) =>
                                setSelectedWinners((current) => ({
                                  ...current,
                                  [market.id]: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-white/10 bg-[#222222] px-4 py-3 text-white outline-none focus:border-purple-500"
                            >
                              <option value="">Choose winner</option>
                              {(market.prediction_options ?? []).map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => void gradeMarket(market.id)}
                              disabled={
                                isGrading || deletingMarketId === market.id
                              }
                              className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-wider hover:bg-emerald-500 disabled:opacity-60"
                            >
                              {isGrading
                                ? "Grading & Paying..."
                                : "Grade Winner & Pay"}
                            </button>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center text-sm font-black text-emerald-300">
                            Settled and paid
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => void deleteMarket(market)}
                          disabled={
                            deletingMarketId === market.id || isGrading
                          }
                          className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-wider text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                        >
                          {deletingMarketId === market.id
                            ? "Deleting..."
                            : "Delete Market"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}