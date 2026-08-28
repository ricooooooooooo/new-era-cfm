"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AppLayout from "@/app/components/layout/AppLayout";

type CatalogItem = {
  key: string;
  name: string;
  price: number;
  description: string;
  limit: number;
};

type MarketData = {
  success: boolean;
  authenticated: boolean;
  catalog: CatalogItem[];
  wallet: {
    balance: number;
  } | null;
  team: string | null;
  purchases: Array<{
    id: string;
    description: string;
    amount: number;
    created_at: string;
    metadata?: {
      status?: string;
      team?: string;
    };
  }>;
};

export default function NewEraMarketPage() {
  const [data, setData] = useState<MarketData | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/dev-market", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ?? "Unable to load Gold Jacket Market.",
      );
    }

    setData(result);
  }, []);

  useEffect(() => {
    void load().catch((loadError) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load market.",
      );
    });
  }, [load]);

  async function buy(itemKey: string) {
    if (buying) return;

    setBuying(itemKey);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/dev-market", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemKey }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Purchase failed.",
        );
      }

      setMessage(
        `${result.item} purchased for ${result.team}. Commissioner fulfillment is now pending.`,
      );

      await load();
    } catch (purchaseError) {
      setError(
        purchaseError instanceof Error
          ? purchaseError.message
          : "Purchase failed.",
      );
    } finally {
      setBuying(null);
    }
  }

  return (
    <AppLayout>
      <main className="min-h-screen bg-[#050606] px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-purple-300">
                Gold Jacket Economy
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-tight">
                Gold Jacket Market
              </h1>

              <p className="mt-3 max-w-2xl text-zinc-400">
                Turn NE Coin into real franchise upgrades.
                Purchases are recorded instantly for commissioner
                fulfillment.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/predictions"
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black"
              >
                Sportsbook
              </Link>

              <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 px-5 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">
                  Balance
                </p>
                <p className="text-2xl font-black">
                  {data?.wallet
                    ? data.wallet.balance.toLocaleString()
                    : "—"}{" "}
                  NE
                </p>
              </div>
            </div>
          </div>

          {data?.team ? (
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-300">
              Purchases apply to:{" "}
              <span className="font-black text-white">
                {data.team}
              </span>
            </div>
          ) : null}

          {message ? (
            <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 font-bold text-emerald-200">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 font-bold text-red-200">
              {error}
            </div>
          ) : null}

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {(data?.catalog ?? []).map((item) => {
              const affordable =
                (data?.wallet?.balance ?? 0) >= item.price;

              return (
                <article
                  key={item.key}
                  className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"
                >
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">
                    Season Limit: {item.limit}
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    {item.name}
                  </h2>

                  <p className="mt-3 min-h-12 text-sm text-zinc-500">
                    {item.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-2xl font-black">
                      {item.price.toLocaleString()}{" "}
                      <span className="text-sm text-purple-300">
                        NE
                      </span>
                    </p>

                    <button
                      type="button"
                      onClick={() => void buy(item.key)}
                      disabled={
                        !data?.authenticated ||
                        !data?.team ||
                        !affordable ||
                        buying === item.key
                      }
                      className="rounded-xl bg-purple-600 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {buying === item.key
                        ? "Buying..."
                        : "Purchase"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {data?.purchases?.length ? (
            <section className="mt-12">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
                Your Orders
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Pending & Recent
              </h2>

              <div className="mt-5 space-y-3">
                {data.purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex flex-col justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-black">
                        {purchase.description}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {purchase.metadata?.team ?? data.team}
                      </p>
                    </div>

                    <p className="font-black text-purple-300">
                      {purchase.amount.toLocaleString()} NE
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </AppLayout>
  );
}
