"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "@/app/components/layout/AppLayout";

type PredictionOption = {
  id: string;
  market_id: string;
  label: string;
  option_key: string | null;
  team_id: string | null;
  odds_multiplier: number | string | null;
  metadata?: {
    abbreviation?: string;
  };
};

type GameData = {
  id: string;
  season: number;
  week: number;
  scheduled_at: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team_abbreviation: string | null;
  away_team_abbreviation: string | null;
  is_primetime: boolean;
  broadcast_label: string | null;
};

type PredictionMarket = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  closes_at: string | null;
  winning_option: string | null;
  created_at: string;
  market_type: string;
  category: string;
  auto_generated: boolean;
  season: number | null;
  week: number | null;
  prediction_options: PredictionOption[];
  league_games: GameData | null;
};

type WalletResponse = {
  balance?: number;
  error?: string;
};

type TeamForm = {
  abbreviation: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  overall: number | null;
};

type LeagueSummaryResponse = {
  teams?: TeamForm[];
};

function logo(abbreviation: string | undefined) {
  return abbreviation
    ? `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${abbreviation}`
    : null;
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

export default function PublicPredictionsPage() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
const [teamForms, setTeamForms] = useState<Record<string, TeamForm>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    {},
  );
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [placingBetFor, setPlacingBetFor] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [marketsResponse, walletResponse, summaryResponse] = await Promise.all([
        fetch("/api/prediction-markets", { cache: "no-store" }),
        fetch("/api/wallet", { cache: "no-store" }),
fetch("/api/league/summary", { cache: "no-store" }),
      ]);

      const marketsData = await marketsResponse.json();
      const walletData = (await walletResponse.json()) as WalletResponse;
const summaryData = summaryResponse.ok
  ? ((await summaryResponse.json()) as LeagueSummaryResponse)
  : { teams: [] };

      if (!marketsResponse.ok) {
        throw new Error(
          marketsData.error ?? "Failed to load prediction markets.",
        );
      }

      setMarkets(Array.isArray(marketsData) ? marketsData : []);

setTeamForms(
  Object.fromEntries(
    (summaryData.teams ?? []).map((team) => [
      team.abbreviation,
      team,
    ]),
  ),
);

      if (walletResponse.ok && typeof walletData.balance === "number") {
        setWalletBalance(walletData.balance);
      } else {
        setWalletBalance(null);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load prediction markets.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();

    const timer =
      window.setInterval(
        () => {
          void loadData();
        },
        15000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, optionId, amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to place bet.");
      }

      setMessage(
        `Bet placed successfully for ${amount.toLocaleString()} NE Coin.`,
      );
      setBetAmounts((current) => ({ ...current, [marketId]: "" }));
      await loadData();
    } catch (betError) {
      setError(
        betError instanceof Error
          ? betError.message
          : "Failed to place bet.",
      );
    } finally {
      setPlacingBetFor(null);
    }
  }

  const openMarkets = useMemo(
    () =>
      markets.filter((market) => {
        if (market.status !== "open") return false;
        if (!market.closes_at) return true;
        return new Date(market.closes_at).getTime() > Date.now();
      }),
    [markets],
  );

  const closedMarkets = useMemo(
    () => markets.filter((market) => !openMarkets.includes(market)),
    [markets, openMarkets],
  );

  const groupedOpenMarkets = useMemo(() => {
    const groups = new Map<string, PredictionMarket[]>();

    for (const market of openMarkets) {
      const key = `Season ${market.season ?? 1} • Week ${market.week ?? "Custom"}`;
      const group = groups.get(key) ?? [];
      group.push(market);
      groups.set(key, group);
    }

    return Array.from(groups.entries());
  }, [openMarkets]);

  return (
    <AppLayout>
      <main className="min-h-[calc(100vh-8rem)] bg-[#050606] text-white">
        <section className="relative overflow-hidden border-b border-white/10 bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(124,58,237,0.32),transparent_34rem),radial-gradient(circle_at_88%_18%,rgba(245,158,11,0.18),transparent_28rem)]" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-6 py-12 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-16">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-purple-300">
                Gold Jacket Sportsbook
              </p>
              <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] sm:text-7xl">
                Put Your NE Coin on It
              </h1>
              <p className="mt-4 max-w-2xl text-zinc-400">
                Weekly game markets will publish automatically from the Madden
                schedule and settle from final scores.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-black/40 px-4 py-3 backdrop-blur">
              <div className="relative h-12 w-12 overflow-hidden rounded-full">
                <Image
                  src="/ne-coin.png"
                  alt="NE Coin"
                  fill
                  className="object-contain"
                  sizes="48px"
                  priority
                />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
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
        </section>

        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 sm:py-10">
        <div className="mb-6 flex justify-end">
          <Link
            href="/market"
            className="rounded-2xl border border-purple-400/30 bg-purple-500/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-purple-200 hover:bg-purple-500/20"
          >
            Gold Jacket Market →
          </Link>
        </div>
          {message ? (
            <div className="mb-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center text-zinc-500">
              Loading markets...
            </div>
          ) : groupedOpenMarkets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-purple-400/20 bg-purple-400/[0.045] p-10 text-center">
              <p className="text-2xl font-black">No open markets right now</p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-400">
                The market engine is ready. The first Madden schedule sync will
                automatically publish a winner market for every game.
              </p>
              <Link
                href="/schedule"
                className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-black hover:bg-white/[0.09]"
              >
                View Schedule
              </Link>
            </div>
          ) : (
            <div className="space-y-10">
              {groupedOpenMarkets.map(([label, group]) => (
                <section key={label}>
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-300">
                        Live Markets
                      </p>
                      <h2 className="mt-2 text-3xl font-black">{label}</h2>
                    </div>
                    <Link
                      href="/schedule"
                      className="text-sm font-black text-zinc-500 transition hover:text-white"
                    >
                      Full Schedule →
                    </Link>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    {group.map((market) => (
                      <article
                        key={market.id}
                        className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f10]"
                      >
                        <div className="flex items-center justify-between border-b border-white/[0.07] bg-black/30 px-5 py-3">
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">
                            Open
                          </span>
                          <span className="text-xs font-bold text-zinc-600">
                            Closes {formatClosingTime(market.closes_at)}
                          </span>
                        </div>

                        <div className="p-5 sm:p-6">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                            {market.auto_generated
                              ? "Automatic Game Market"
                              : "Commissioner Market"}
                          </p>
                          <h3 className="mt-2 text-2xl font-black">
                            {market.title}
                          </h3>
                          {market.description ? (
                            <p className="mt-2 text-sm text-zinc-500">
                              {market.description}
                            </p>
                          ) : null}

                          <div className="mt-5 grid gap-3">
                            {(market.prediction_options ?? []).map((option) => {
                              const selected =
                                selectedOptions[market.id] === option.id;
                              const abbreviation =
                                option.metadata?.abbreviation;
                              const teamLogo = logo(abbreviation);
const form = abbreviation
  ? teamForms[abbreviation]
  : undefined;

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
                                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                                    selected
                                      ? "border-purple-400 bg-purple-500/15"
                                      : "border-white/10 bg-white/[0.035] hover:border-white/20"
                                  }`}
                                >
                                  {teamLogo ? (
                                    <div className="relative h-12 w-12 shrink-0">
                                      <Image
                                        src={teamLogo}
                                        alt={option.label}
                                        fill
                                        unoptimized
                                        className="object-contain"
                                      />
                                    </div>
                                  ) : null}

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-black">
                                      {option.label}
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-600">
                                      {Number(
                                        option.odds_multiplier ?? 2,
                                      ).toFixed(2)}
                                      x payout
                                    </p>
                    {form ? (
                      <p className="mt-2 text-xs font-bold text-purple-200">
                        {form.wins}-{form.losses}
                        {form.ties ? `-${form.ties}` : ""}
                        {" • "}
                        OVR {form.overall ?? "—"}
                        {" • "}
                        PPG {form.pointsPerGame}
                        {" • "}
                        PA/G {form.pointsAllowedPerGame}
                        {" • "}
                        DIFF {form.pointDifferential >= 0 ? "+" : ""}
                        {form.pointDifferential}
                      </p>
                    ) : null}
                                  </div>

                                  <span
                                    className={`h-4 w-4 rounded-full border ${
                                      selected
                                        ? "border-purple-300 bg-purple-500"
                                        : "border-zinc-700"
                                    }`}
                                  />
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
                              placeholder="NE Coin wager"
                              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-zinc-700 focus:border-purple-400"
                            />

                            <button
                              type="button"
                              onClick={() => void placeBet(market.id)}
                              disabled={placingBetFor === market.id}
                              className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] hover:bg-purple-500 disabled:opacity-50"
                            >
                              {placingBetFor === market.id
                                ? "Placing..."
                                : "Place Bet"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {closedMarkets.length > 0 ? (
            <section className="mt-12">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-600">
                Market History
              </p>
              <h2 className="mt-2 text-3xl font-black">Closed & Settled</h2>

              <div className="mt-5 grid gap-3">
                {closedMarkets.slice(0, 20).map((market) => (
                  <article
                    key={market.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black">{market.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-600">
                        {market.status}
                      </p>
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
                      {market.winning_option
                        ? "Result Paid"
                        : "Awaiting Result"}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </AppLayout>
  );
}
