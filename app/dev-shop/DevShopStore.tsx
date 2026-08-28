"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Product = {
  key: string;
  name: string;
  price: number;
  kind: "dev" | "non_physical" | "physical";
  limit: number;
  scope: "team_season" | "player_season" | "player_franchise";
  description: string;
  capText: string;
  approvalText: string | null;
};

type AttributeOption = {
  key: string;
  label: string;
  value: number;
};

type StorePlayer = {
  id: string;
  name: string;
  position: string | null;
  overall: number | null;
  devTrait: string | null;
  headshotUrl: string | null;
  teamAbbreviation: string | null;
  physicalAttributes: AttributeOption[];
  nonPhysicalAttributes: AttributeOption[];
};

type Availability = {
  used: number;
  limit: number;
  remaining: number;
  soldOut: boolean;
  reset: "season" | "franchise";
  scope?: "team" | "player";
};

type StoreResponse = {
  success: boolean;
  authenticated: boolean;
  error?: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
  };
  team?: {
    slug: string;
    city: string;
    name: string;
    fullName: string;
    abbreviation: string;
  } | null;
  league?: {
    id: string;
    name: string | null;
    slug: string | null;
    season: number;
    currentWeek: number | null;
  } | null;
  season?: number;
  catalog: Product[];
  players?: StorePlayer[];
  availabilityByPlayer?: Record<string, Record<string, Availability>>;
  orders?: Array<{
    orderId: string;
    total: number;
    createdAt: string;
    voided: boolean;
    lines: Array<{
      productName: string;
      playerName: string;
    }>;
  }>;
  cashAppUrl: string;
  commissionerDiscordUrl: string;
};

type CartUnit = {
  tempId: string;
  productKey: string;
  productName: string;
  price: number;
  kind: Product["kind"];
  playerId: string;
  playerName: string;
  attributeKey: string;
};

type Receipt = {
  orderId: string;
  total: number;
  clipboardText: string;
  cashAppUrl: string;
  commissionerDiscordUrl: string;
};

const DEV_KEYS = new Set(["star_dev", "superstar_dev", "xfactor_dev"]);

function money(value: number) {
  return `$${Number(value).toFixed(0)}`;
}

function capStatus(
  product: Product,
  availability: Availability | undefined,
  cartCount: number,
  selectedPlayer: StorePlayer | null,
) {
  if (!selectedPlayer) {
    return {
      remaining: 0,
      label: "Choose a player",
      soldOut: true,
    };
  }

  if (
    product.key === "non_physical_plus_2" &&
    !selectedPlayer.nonPhysicalAttributes.some(
      (attribute) => Number(attribute.value) + 2 <= 98,
    )
  ) {
    return {
      remaining: 0,
      label: "NO ELIGIBLE ATTRIBUTES • 98 CAP",
      soldOut: true,
    };
  }

  if (
    product.key === "physical_plus_1" &&
    !selectedPlayer.physicalAttributes.some(
      (attribute) => Number(attribute.value) + 1 <= 93,
    )
  ) {
    return {
      remaining: 0,
      label: "NO ELIGIBLE ATTRIBUTES • 93 CAP",
      soldOut: true,
    };
  }

  const baseRemaining = availability?.remaining ?? product.limit;
  const remaining = Math.max(0, baseRemaining - cartCount);

  if (remaining === 0) {
    return {
      remaining,
      label:
        availability?.scope === "team"
          ? "SOLD OUT • AVAILABLE NEXT SEASON"
          : availability?.reset === "franchise"
            ? "3 / 3 USED • FRANCHISE LIMIT REACHED"
            : "SOLD OUT FOR THIS PLAYER • AVAILABLE NEXT SEASON",
      soldOut: true,
    };
  }

  return {
    remaining,
    label:
      availability?.scope === "team"
        ? `${availability?.used ?? 0} / ${availability?.limit ?? product.limit} USED • TEAM SEASON LIMIT`
        : `${availability?.used ?? 0} / ${availability?.limit ?? product.limit} USED`,
    soldOut: false,
  };
}

export default function DevShopStore() {
  const [store, setStore] = useState<StoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartUnit[]>([]);
  const [freePlayerId, setFreePlayerId] = useState("");
  const [freeAttributeKey, setFreeAttributeKey] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);

  const loadStore = useCallback(async () => {
    const response = await fetch("/api/dev-shop/store", {
      cache: "no-store",
    });
    const result = (await response.json()) as StoreResponse;

    if (!response.ok || !result.success) {
      throw new Error(result.error ?? "Unable to load the Dev Shop.");
    }

    setStore(result);
    setLoadError("");

    const players = result.players ?? [];
    const validPlayerIds = new Set(players.map((player) => player.id));

    setSelectedPlayerId((current) =>
      current && validPlayerIds.has(current)
        ? current
        : players[0]?.id ?? "",
    );

    // A Madden sync can move players between teams. Drop stale cart lines
    // immediately so a traded-away player cannot stay purchasable in an open tab.
    setCart((current) =>
      current.filter((item) => validPlayerIds.has(item.playerId)),
    );
  }, []);

  useEffect(() => {
    void loadStore()
      .catch((error) => {
        setLoadError(
          error instanceof Error ? error.message : "Unable to load the Dev Shop.",
        );
      })
      .finally(() => setLoading(false));

    const rosterRefresh = window.setInterval(() => {
      void loadStore().catch(() => {
        // Keep the last valid roster visible if one background refresh fails.
      });
    }, 60_000);

    return () => window.clearInterval(rosterRefresh);
  }, [loadStore]);

  const players = store?.players ?? [];
  const catalog = store?.catalog ?? [];
  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? null;

  const hasPaidDev = cart.some((item) => DEV_KEYS.has(item.productKey));

  useEffect(() => {
    if (!hasPaidDev) {
      setFreePlayerId("");
      setFreeAttributeKey("");
      return;
    }

    setFreePlayerId((current) => {
      if (current && players.some((player) => player.id === current)) {
        return current;
      }

      const firstDev = cart.find((item) => DEV_KEYS.has(item.productKey));
      const firstDevEligible =
        firstDev &&
        (store?.availabilityByPlayer?.[firstDev.playerId]?.[
          "physical_plus_1"
        ]?.remaining ?? 3) > 0
          ? firstDev.playerId
          : null;
      const firstEligible =
        players.find(
          (player) =>
            (store?.availabilityByPlayer?.[player.id]?.[
              "physical_plus_1"
            ]?.remaining ?? 3) > 0,
        )?.id ?? "";
      return firstDevEligible ?? firstEligible;
    });
  }, [cart, hasPaidDev, players, store?.availabilityByPlayer]);

  const freePlayer =
    players.find((player) => player.id === freePlayerId) ?? null;

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price, 0),
    [cart],
  );

  const groupedCart = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        productKey: string;
        productName: string;
        playerId: string;
        playerName: string;
        price: number;
        count: number;
      }
    >();

    for (const item of cart) {
      const key = `${item.productKey}:${item.playerId}`;
      const current = groups.get(key);

      if (current) {
        current.count += 1;
      } else {
        groups.set(key, {
          key,
          productKey: item.productKey,
          productName: item.productName,
          playerId: item.playerId,
          playerName: item.playerName,
          price: item.price,
          count: 1,
        });
      }
    }

    return [...groups.values()];
  }, [cart]);

  function cartCount(productKey: string, playerId: string) {
    return cart.filter((item) => {
      if (item.productKey !== productKey) return false;

      // Dev products are one per owner/team each season, regardless of
      // which roster player receives the upgrade.
      if (DEV_KEYS.has(productKey)) return true;

      return item.playerId === playerId;
    }).length;
  }

  function quantityFor(product: Product, max: number) {
    const raw = quantities[product.key] ?? 1;
    return Math.max(1, Math.min(raw, Math.max(1, max)));
  }

  function setQuantity(product: Product, next: number, max: number) {
    setQuantities((current) => ({
      ...current,
      [product.key]: Math.max(1, Math.min(next, Math.max(1, max))),
    }));
  }

  function addToCart(product: Product) {
    if (!selectedPlayer) return;

    const availability =
      store?.availabilityByPlayer?.[selectedPlayer.id]?.[product.key];
    const status = capStatus(
      product,
      availability,
      cartCount(product.key, selectedPlayer.id),
      selectedPlayer,
    );

    if (status.soldOut) return;

    const quantity = quantityFor(product, status.remaining);
    const additions = Array.from({ length: quantity }, () => ({
      tempId: crypto.randomUUID(),
      productKey: product.key,
      productName: product.name,
      price: product.price,
      kind: product.kind,
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      attributeKey: "",
    }));

    setCart((current) => [...current, ...additions]);
    setQuantities((current) => ({ ...current, [product.key]: 1 }));
    setCheckoutError("");
    setReceipt(null);
  }

  function removeOne(productKey: string, playerId: string) {
    setCart((current) => {
      const index = current.findIndex(
        (item) =>
          item.productKey === productKey && item.playerId === playerId,
      );
      if (index === -1) return current;

      return [...current.slice(0, index), ...current.slice(index + 1)];
    });
  }

  function addOneFromGroup(productKey: string, playerId: string) {
    const product = catalog.find((entry) => entry.key === productKey);
    const player = players.find((entry) => entry.id === playerId);
    if (!product || !player) return;

    const availability =
      store?.availabilityByPlayer?.[player.id]?.[product.key];
    const status = capStatus(
      product,
      availability,
      cartCount(product.key, player.id),
      player,
    );

    if (status.soldOut) return;

    setCart((current) => [
      ...current,
      {
        tempId: crypto.randomUUID(),
        productKey: product.key,
        productName: product.name,
        price: product.price,
        kind: product.kind,
        playerId: player.id,
        playerName: player.name,
        attributeKey: "",
      },
    ]);
  }

  function setCartAttribute(tempId: string, attributeKey: string) {
    setCart((current) =>
      current.map((item) =>
        item.tempId === tempId ? { ...item, attributeKey } : item,
      ),
    );
  }

  function optionsForItem(item: CartUnit) {
    const player = players.find((entry) => entry.id === item.playerId);
    if (!player) return [];

    return item.kind === "physical"
      ? player.physicalAttributes.filter(
          (attribute) => Number(attribute.value) + 1 <= 93,
        )
      : player.nonPhysicalAttributes.filter(
          (attribute) => Number(attribute.value) + 2 <= 98,
        );
  }

  async function purchase() {
    if (!store?.authenticated) {
      setCheckoutError("Connect Discord before purchasing.");
      return;
    }

    if (!store.team) {
      setCheckoutError("Your Discord account does not have a team linked yet.");
      return;
    }

    if (cart.length === 0) {
      setCheckoutError("Your cart is empty.");
      return;
    }

    const missingAttribute = cart.find(
      (item) => item.kind !== "dev" && !item.attributeKey,
    );

    if (missingAttribute) {
      setCheckoutError(
        `Choose an attribute for ${missingAttribute.playerName}'s ${missingAttribute.productName}.`,
      );
      return;
    }

    if (hasPaidDev && (!freePlayerId || !freeAttributeKey)) {
      setCheckoutError(
        "Choose the player and attribute for your one free physical upgrade.",
      );
      return;
    }

    setPurchasing(true);
    setCheckoutError("");
    setReceipt(null);

    try {
      const checkoutToken = crypto.randomUUID();

      const response = await fetch("/api/dev-shop/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkoutToken,
          items: cart.map((item) => ({
            productKey: item.productKey,
            playerId: item.playerId,
            attributeKey: item.attributeKey || null,
          })),
          freePhysical: hasPaidDev
            ? {
                playerId: freePlayerId,
                attributeKey: freeAttributeKey,
              }
            : null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Purchase failed.");
      }

      setReceipt(result.order as Receipt);
      setCart([]);
      setQuantities({});
      setFreePlayerId("");
      setFreeAttributeKey("");
      await loadStore();
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Purchase failed.",
      );
    } finally {
      setPurchasing(false);
    }
  }

  async function copyReceipt() {
    if (!receipt?.clipboardText) return;

    try {
      await navigator.clipboard.writeText(receipt.clipboardText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCheckoutError("Copy failed. Select the order text and copy it manually.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-[#f5f0e4]">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-8 w-52 rounded bg-white/10" />
          <div className="mt-4 h-16 w-full max-w-3xl rounded bg-white/[0.06]" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f0e4]">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-7 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-[#d7b56d]/20 bg-[radial-gradient(circle_at_85%_10%,rgba(215,181,109,.18),transparent_26rem),linear-gradient(135deg,#12100b,#070707_58%)] p-6 shadow-[0_30px_100px_rgba(0,0,0,.38)] sm:p-9">
          <div className="pointer-events-none absolute -right-3 -top-14 text-[11rem] font-black leading-none text-[#f1d58a]/[0.035]">
            $
          </div>

          <div className="relative max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d7b56d]">
              Gold Jacket CFM • Season {store?.season ?? 1}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
              Dev Shop
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Build your roster. Every purchase is tracked automatically by
              user, player and season.
            </p>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#d7b56d]/25 bg-[#d7b56d]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.13em] text-[#efd48c]">
              Buy 1 Dev → 1 Free Physical
            </span>
            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-2 text-[10px] font-black uppercase tracking-[0.13em] text-zinc-400">
              Max 1 free physical per order
            </span>
            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-2 text-[10px] font-black uppercase tracking-[0.13em] text-zinc-400">
              Purchases count immediately
            </span>
          </div>
        </header>

        {loadError ? (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-200">
            {loadError}
          </div>
        ) : null}

        {!store?.authenticated ? (
          <div className="mt-6 rounded-3xl border border-[#d7b56d]/20 bg-[#d7b56d]/[0.055] p-6">
            <p className="text-lg font-black">Connect Discord to shop.</p>
            <p className="mt-2 text-sm text-zinc-400">
              Purchases have to be tied to your Gold Jacket account.
            </p>
          </div>
        ) : null}

        {store?.authenticated && !store.team ? (
          <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-500/[0.07] p-6">
            <p className="text-lg font-black">Your team is not linked yet.</p>
            <p className="mt-2 text-sm text-zinc-400">
              The store will unlock as soon as your Discord account has a team assignment.
            </p>
          </div>
        ) : null}

        <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_360px]">
          <div>
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#a98a45]">
                    Shopping For
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Choose a player</h2>
                </div>

                <select
                  value={selectedPlayerId}
                  onChange={(event) => setSelectedPlayerId(event.target.value)}
                  disabled={!players.length}
                  className="min-w-[260px] rounded-2xl border border-[#d7b56d]/20 bg-[#0a0a09] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#e5c66f]/55 disabled:opacity-40"
                >
                  {!players.length ? (
                    <option value="">Roster loads after team sync</option>
                  ) : null}
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} • {player.position ?? "—"} • {player.overall ?? "—"} OVR
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlayer ? (
                <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-zinc-300">
                    {selectedPlayer.position ?? "PLAYER"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-zinc-300">
                    {selectedPlayer.overall ?? "—"} OVR
                  </span>
                  <span className="rounded-full border border-[#d7b56d]/20 bg-[#d7b56d]/[0.07] px-3 py-1.5 text-[#e6c773]">
                    {selectedPlayer.devTrait ?? "DEV UNKNOWN"}
                  </span>
                </div>
              ) : null}
            </section>

            <section className="mt-5 grid gap-4 md:grid-cols-2">
              {catalog.map((product) => {
                const availability = selectedPlayer
                  ? store?.availabilityByPlayer?.[selectedPlayer.id]?.[product.key]
                  : undefined;
                const inCart = selectedPlayer
                  ? cartCount(product.key, selectedPlayer.id)
                  : 0;
                const status = capStatus(
                  product,
                  availability,
                  inCart,
                  selectedPlayer,
                );
                const quantity = quantityFor(product, status.remaining);
                const maxQuantity =
                  product.kind === "dev" ? Math.min(1, status.remaining) : status.remaining;

                return (
                  <article
                    key={product.key}
                    className={`relative overflow-hidden rounded-[1.7rem] border p-5 transition sm:p-6 ${
                      status.soldOut
                        ? "border-white/[0.07] bg-white/[0.018] opacity-65"
                        : "border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.035),rgba(215,181,109,.025))] hover:-translate-y-0.5 hover:border-[#d7b56d]/35"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#ad8c43]">
                          {product.capText}
                        </p>
                        <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-white">
                          {product.name}
                        </h3>
                      </div>
                      <p className="shrink-0 text-3xl font-black tracking-[-0.06em] text-[#efcf7d]">
                        {money(product.price)}
                      </p>
                    </div>

                    <p className="mt-4 min-h-[42px] text-sm leading-6 text-zinc-500">
                      {product.description}
                    </p>

                    <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/20 px-3 py-2.5">
                      <p className={`text-[9px] font-black uppercase tracking-[0.12em] ${
                        status.soldOut ? "text-zinc-600" : "text-[#c7a754]"
                      }`}>
                        {status.label}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className="flex items-center overflow-hidden rounded-xl border border-white/10 bg-black/25">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(product, quantity - 1, maxQuantity)
                          }
                          disabled={status.soldOut || quantity <= 1}
                          className="h-10 w-10 text-lg font-black text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-25"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm font-black tabular-nums text-white">
                          {status.soldOut ? 0 : quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(product, quantity + 1, maxQuantity)
                          }
                          disabled={
                            status.soldOut ||
                            product.kind === "dev" ||
                            quantity >= maxQuantity
                          }
                          className="h-10 w-10 text-lg font-black text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-25"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={status.soldOut || !store?.authenticated || !store?.team}
                        className="flex-1 rounded-xl bg-[#e0bd66] px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#090805] transition hover:bg-[#f0d688] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                      >
                        {status.soldOut ? "Unavailable" : "Add To Cart"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#a78948]">
                Store Rules
              </p>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-500 sm:grid-cols-2">
                <p>
                  Each team can purchase one Star, one Superstar and one X-Factor Dev per season.
                </p>
                <p>
                  Non-physical upgrades are capped at 6 per player per season, and the selected attribute cannot be upgraded above 98.
                </p>
                <p>
                  Physical upgrades are capped at 3 per player for the franchise, and the selected attribute cannot be upgraded above 93.
                </p>
                <p>
                  Purchases are recorded the instant you press Purchase. Commissioner voids restore the cap.
                </p>
              </div>
            </section>
          </div>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="overflow-hidden rounded-[1.8rem] border border-[#d7b56d]/20 bg-[#0b0a08] shadow-[0_24px_80px_rgba(0,0,0,.32)]">
              <div className="border-b border-white/[0.07] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#a88945]">
                      Your Cart
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {cart.length} {cart.length === 1 ? "upgrade" : "upgrades"}
                    </h2>
                  </div>
                  <p className="text-2xl font-black text-[#edce7a]">
                    {money(cartSubtotal)}
                  </p>
                </div>
              </div>

              <div className="max-h-[360px] space-y-3 overflow-y-auto p-4">
                {!groupedCart.length ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
                    <p className="text-sm font-bold text-zinc-500">
                      Your cart is empty.
                    </p>
                    <p className="mt-1 text-xs text-zinc-700">
                      Pick a player, set a quantity and add an upgrade.
                    </p>
                  </div>
                ) : null}

                {groupedCart.map((group) => (
                  <div
                    key={group.key}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">
                          {group.productName}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600">
                          {group.playerName}
                        </p>
                      </div>
                      <p className="text-sm font-black text-[#d9b961]">
                        {money(group.price * group.count)}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-white/10 bg-black/25">
                        <button
                          type="button"
                          onClick={() => removeOne(group.productKey, group.playerId)}
                          className="h-8 w-8 text-zinc-500 hover:text-white"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-xs font-black">
                          {group.count}
                        </span>
                        <button
                          type="button"
                          onClick={() => addOneFromGroup(group.productKey, group.playerId)}
                          className="h-8 w-8 text-zinc-500 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((current) =>
                            current.filter(
                              (item) =>
                                !(
                                  item.productKey === group.productKey &&
                                  item.playerId === group.playerId
                                ),
                            ),
                          )
                        }
                        className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-700 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {cart.length ? (
                <div className="border-t border-white/[0.07] p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
                    Configure Upgrades
                  </p>

                  <div className="mt-3 max-h-[330px] space-y-3 overflow-y-auto pr-1">
                    {cart
                      .filter((item) => item.kind !== "dev")
                      .map((item, index) => {
                        const options = optionsForItem(item);
                        return (
                          <label
                            key={item.tempId}
                            className="block rounded-xl border border-white/[0.07] bg-black/25 p-3"
                          >
                            <span className="block text-[10px] font-black text-white">
                              {item.playerName} • {item.productName}
                            </span>
                            <span className="mt-1 block text-[9px] text-zinc-700">
                              Upgrade #{index + 1}
                            </span>
                            <select
                              value={item.attributeKey}
                              onChange={(event) =>
                                setCartAttribute(item.tempId, event.target.value)
                              }
                              className="mt-2 w-full rounded-lg border border-white/10 bg-[#0a0a09] px-3 py-2 text-xs text-white outline-none focus:border-[#d7b56d]/50"
                            >
                              <option value="">Choose attribute</option>
                              {options.map((attribute) => (
                                <option key={attribute.key} value={attribute.key}>
                                  {attribute.label} • {attribute.value}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      })}

                    {hasPaidDev ? (
                      <div className="rounded-2xl border border-[#d7b56d]/25 bg-[#d7b56d]/[0.07] p-3.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#e0bf69]">
                          Free Physical • $0
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          One free physical total for this order.
                        </p>

                        <select
                          value={freePlayerId}
                          onChange={(event) => {
                            setFreePlayerId(event.target.value);
                            setFreeAttributeKey("");
                          }}
                          className="mt-3 w-full rounded-lg border border-[#d7b56d]/20 bg-[#0a0a09] px-3 py-2 text-xs text-white outline-none"
                        >
                          <option value="">Choose player</option>
                          {players
                            .filter(
                              (player) =>
                                (store?.availabilityByPlayer?.[player.id]?.[
                                  "physical_plus_1"
                                ]?.remaining ?? 3) > 0,
                            )
                            .map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.name}
                              </option>
                            ))}
                        </select>

                        <select
                          value={freeAttributeKey}
                          onChange={(event) =>
                            setFreeAttributeKey(event.target.value)
                          }
                          className="mt-2 w-full rounded-lg border border-[#d7b56d]/20 bg-[#0a0a09] px-3 py-2 text-xs text-white outline-none"
                        >
                          <option value="">Choose physical attribute</option>
                          {(freePlayer?.physicalAttributes ?? [])
                            .filter((attribute) => attribute.value < 93)
                            .map((attribute) => (
                              <option key={attribute.key} value={attribute.key}>
                                {attribute.label} • {attribute.value}
                              </option>
                            ))}
                        </select>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-4">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-zinc-600">
                      Total
                    </span>
                    <span className="text-3xl font-black text-[#f0d383]">
                      {money(cartSubtotal)}
                    </span>
                  </div>

                  {checkoutError ? (
                    <div className="mt-3 rounded-xl border border-red-400/15 bg-red-500/[0.08] p-3 text-xs font-bold leading-5 text-red-200">
                      {checkoutError}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void purchase()}
                    disabled={purchasing}
                    className="mt-4 w-full rounded-xl bg-[#e4c46f] px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-[#080704] transition hover:bg-[#f1d993] disabled:opacity-50"
                  >
                    {purchasing ? "Processing..." : `Purchase • ${money(cartSubtotal)}`}
                  </button>

                  <p className="mt-3 text-center text-[9px] leading-4 text-zinc-700">
                    Purchase records the order and consumes upgrade limits immediately.
                    Payment is completed through Cash App after checkout.
                  </p>
                </div>
              ) : null}
            </div>
          </aside>
        </div>

        {receipt ? (
          <section className="mt-7 overflow-hidden rounded-[2rem] border border-[#d7b56d]/30 bg-[linear-gradient(135deg,rgba(215,181,109,.11),rgba(8,8,7,.97))] p-6 sm:p-8">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#d7b56d]">
              Purchase Recorded
            </p>
            <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.045em]">
                  Order {receipt.orderId}
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Copy the order, pay with Cash App, then paste it into the commissioner DM.
                </p>
              </div>
              <p className="text-4xl font-black text-[#efcf7e]">
                {money(receipt.total)}
              </p>
            </div>

            <pre className="mt-5 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/35 p-4 text-xs leading-6 text-zinc-300">
              {receipt.clipboardText}
            </pre>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => void copyReceipt()}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.1em] hover:bg-white/[0.08]"
              >
                {copied ? "Copied ✓" : "Copy Order"}
              </button>

              <a
                href={receipt.cashAppUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#e1c16d] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.1em] text-black hover:bg-[#efd58b]"
              >
                Pay With Cash App
              </a>

              <a
                href={receipt.commissionerDiscordUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[#d7b56d]/25 bg-[#d7b56d]/[0.07] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.1em] text-[#ead08b]"
              >
                DM Commissioner
              </a>
            </div>
          </section>
        ) : null}

        {store?.orders?.length ? (
          <section className="mt-8">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#94783c]">
                Your Purchase History
              </p>
              <h2 className="mt-1 text-2xl font-black">Recent orders</h2>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {store.orders.slice(0, 6).map((order) => (
                <article
                  key={order.orderId}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-white">{order.orderId}</p>
                    <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${
                      order.voided
                        ? "bg-red-500/10 text-red-300"
                        : "bg-[#d7b56d]/10 text-[#d7b56d]"
                    }`}>
                      {order.voided ? "Voided" : "Recorded"}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-black text-[#e7c979]">
                    {money(order.total)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {order.lines.length} {order.lines.length === 1 ? "upgrade" : "upgrades"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-3xl border border-white/[0.07] bg-white/[0.018] p-5 text-xs leading-6 text-zinc-600 sm:p-6">
          <p className="font-black uppercase tracking-[0.16em] text-zinc-500">
            Purchase disclaimer
          </p>
          <p className="mt-2 max-w-4xl">
            All Dev Shop money goes back into Gold Jacket CFM, including the
            Super Bowl prize pool, league promotion, boosts and league costs.
            If the league is dumped or destroyed, Dev Shop payments are refunded
            to the users who made them.
          </p>
        </section>
      </div>
    </main>
  );
}
