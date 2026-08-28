"use client";

import { useCallback, useEffect, useState } from "react";

import AppLayout from "@/app/components/layout/AppLayout";

type Order = {
  orderId: string;
  discordUsername: string;
  displayName: string;
  teamName: string | null;
  season: number;
  total: number;
  createdAt: string;
  voided: boolean;
  lines: Array<{
    productName: string;
    playerName: string;
    attributeLabel: string | null;
    paid: boolean;
    unitPrice: number;
  }>;
};

export default function CommissionerDevShopPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [voiding, setVoiding] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/commissioner/dev-shop/orders", {
      cache: "no-store",
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error ?? "Unable to load orders.");
    }

    setOrders(result.orders ?? []);
  }, []);

  useEffect(() => {
    void load()
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to load orders.",
        ),
      )
      .finally(() => setLoading(false));
  }, [load]);

  async function voidOrder(orderId: string) {
    if (
      !window.confirm(
        `Void ${orderId}? This restores the player's Dev Shop limits.`,
      )
    ) {
      return;
    }

    setVoiding(orderId);
    setError("");

    try {
      const response = await fetch(
        `/api/commissioner/dev-shop/orders/${encodeURIComponent(orderId)}/void`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "Voided by commissioner",
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to void order.");
      }

      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to void order.",
      );
    } finally {
      setVoiding(null);
    }
  }

  return (
    <AppLayout>
      <main className="min-h-screen bg-[#050505] px-4 py-8 text-[#f5f0e4] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b56d]">
            Gold Jacket Commissioner
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            Dev Shop Orders
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-500">
            Purchases are automatic. Void only incorrect or invalid orders;
            voiding restores all consumed player limits.
          </p>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="mt-8 text-sm font-bold text-zinc-600">
              Loading orders…
            </p>
          ) : null}

          <div className="mt-8 space-y-3">
            {orders.map((order) => (
              <article
                key={order.orderId}
                className="rounded-3xl border border-white/10 bg-white/[0.025] p-5"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black">{order.orderId}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${
                          order.voided
                            ? "bg-red-500/10 text-red-300"
                            : "bg-[#d7b56d]/10 text-[#e1c370]"
                        }`}
                      >
                        {order.voided ? "Voided" : "Active"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">
                      @{order.discordUsername} • {order.teamName ?? "No team"} •
                      Season {order.season}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-black text-[#e8c979]">
                      ${order.total}
                    </p>
                    {!order.voided ? (
                      <button
                        type="button"
                        onClick={() => void voidOrder(order.orderId)}
                        disabled={voiding === order.orderId}
                        className="rounded-xl border border-red-400/20 bg-red-500/[0.08] px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-red-200 hover:bg-red-500/[0.13] disabled:opacity-40"
                      >
                        {voiding === order.orderId ? "Voiding…" : "Void Order"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {order.lines.map((line, index) => (
                    <div
                      key={`${order.orderId}-${index}`}
                      className="rounded-xl border border-white/[0.07] bg-black/20 p-3"
                    >
                      <p className="text-xs font-black text-white">
                        {line.paid ? "" : "FREE • "}
                        {line.productName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {line.playerName}
                        {line.attributeLabel ? ` • ${line.attributeLabel}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}

            {!loading && orders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm font-bold text-zinc-600">
                No Dev Shop orders yet.
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
