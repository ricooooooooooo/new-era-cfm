import test from "node:test";
import assert from "node:assert/strict";

import {
  PRODUCT_KEYS,
  getPaidProduct,
} from "../lib/dev-shop/catalog.mjs";
import {
  buildOrderLedger,
  flattenActiveLines,
} from "../lib/dev-shop/ledger.mjs";
import {
  getAvailability,
  validateOrderUnits,
} from "../lib/dev-shop/caps.mjs";
import { formatOrderForClipboard } from "../lib/dev-shop/order-format.mjs";

function orderRow({
  id = "row-1",
  orderId = "GJ-1-A",
  token = "token-a",
  discordId = "u1",
  teamSlug = "cardinals",
  season = 1,
  lines = [],
  receivedAt = "2026-08-28T20:00:00.000Z",
}) {
  return {
    id,
    export_type: "dev_shop_order",
    received_at: receivedAt,
    payload: {
      kind: "gold_jacket_dev_shop_order",
      orderId,
      checkoutToken: token,
      discordId,
      discordUsername: "rico",
      displayName: "Rico",
      teamSlug,
      teamName: "Arizona Cardinals",
      leagueId: null,
      season,
      total: lines.reduce((sum, line) => sum + (line.unitPrice ?? 0), 0),
      createdAt: receivedAt,
      lines,
    },
  };
}

function voidRow(orderId, receivedAt = "2026-08-28T21:00:00.000Z") {
  return {
    id: `void-${orderId}`,
    export_type: "dev_shop_order_void",
    received_at: receivedAt,
    payload: {
      kind: "gold_jacket_dev_shop_order_void",
      orderId,
      voidedAt: receivedAt,
      voidedByDiscordId: "commissioner",
    },
  };
}

function unit(productKey, playerId = "p1", attributeKey = null, overrides = {}) {
  const paidProduct = getPaidProduct(productKey);
  const isFree = productKey === PRODUCT_KEYS.FREE_PHYSICAL;
  return {
    lineId: crypto.randomUUID(),
    productKey,
    productName: isFree ? "+1 Physical Upgrade" : paidProduct.name,
    paid: !isFree,
    unitPrice: isFree ? 0 : paidProduct.price,
    playerId,
    playerName: playerId === "p1" ? "Player One" : "Player Two",
    attributeKey,
    attributeLabel: attributeKey,
    ...overrides,
  };
}

const player = {
  id: "p1",
  name: "Player One",
  overall: 90,
  physicalAttributes: [
    { key: "speed", label: "Speed", value: 90 },
    { key: "acceleration", label: "Acceleration", value: 91 },
  ],
  nonPhysicalAttributes: [
    { key: "catching", label: "Catching", value: 88 },
    { key: "routeRunning", label: "Route Running", value: 87 },
  ],
};

test("catalog uses the approved real-money prices", () => {
  assert.equal(getPaidProduct(PRODUCT_KEYS.STAR).price, 2);
  assert.equal(getPaidProduct(PRODUCT_KEYS.SUPERSTAR).price, 5);
  assert.equal(getPaidProduct(PRODUCT_KEYS.XFACTOR).price, 8);
  assert.equal(getPaidProduct(PRODUCT_KEYS.NON_PHYSICAL).price, 1);
  assert.equal(getPaidProduct(PRODUCT_KEYS.PHYSICAL).price, 3);
});

test("duplicate checkout tokens only count once", () => {
  const line = unit(PRODUCT_KEYS.XFACTOR);
  const rows = [
    orderRow({ id: "a", orderId: "GJ-A", token: "same", lines: [line] }),
    orderRow({
      id: "b",
      orderId: "GJ-B",
      token: "same",
      lines: [line],
      receivedAt: "2026-08-28T20:01:00.000Z",
    }),
  ];
  const orders = buildOrderLedger(rows);
  assert.equal(orders.length, 1);
  assert.equal(flattenActiveLines(orders).length, 1);
});

test("voiding an order restores cap availability", () => {
  const rows = [
    orderRow({
      orderId: "GJ-X",
      lines: [unit(PRODUCT_KEYS.XFACTOR)],
    }),
  ];
  let orders = buildOrderLedger(rows);
  let active = flattenActiveLines(orders);
  assert.equal(getAvailability(active, "p1", 1, { discordId: "u1", teamSlug: "cardinals" })[PRODUCT_KEYS.XFACTOR].remaining, 0);

  orders = buildOrderLedger([...rows, voidRow("GJ-X")]);
  active = flattenActiveLines(orders);
  assert.equal(getAvailability(active, "p1", 1, { discordId: "u1", teamSlug: "cardinals" })[PRODUCT_KEYS.XFACTOR].remaining, 1);
});

test("x-factor is limited to one per owner/team per season even on different players", () => {
  const playerTwo = { ...player, id: "p2", name: "Player Two" };
  const active = [
    {
      ...unit(PRODUCT_KEYS.XFACTOR, "p1"),
      season: 1,
      discordId: "u1",
      teamSlug: "cardinals",
    },
  ];
  const result = validateOrderUnits({
    units: [unit(PRODUCT_KEYS.XFACTOR, "p2")],
    activeLines: active,
    season: 1,
    discordId: "u1",
    teamSlug: "cardinals",
    playersById: new Map([["p1", player], ["p2", playerTwo]]),
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /team.*season|sold out/i);
});

test("same team cannot buy a second dev after ownership changes", () => {
  const playerTwo = { ...player, id: "p2", name: "Player Two" };
  const active = [
    {
      ...unit(PRODUCT_KEYS.SUPERSTAR, "p1"),
      season: 1,
      discordId: "old-owner",
      teamSlug: "cardinals",
    },
  ];
  const result = validateOrderUnits({
    units: [unit(PRODUCT_KEYS.SUPERSTAR, "p2")],
    activeLines: active,
    season: 1,
    discordId: "new-owner",
    teamSlug: "cardinals",
    playersById: new Map([["p1", player], ["p2", playerTwo]]),
  });

  assert.equal(result.ok, false);
});

test("different owner on a different team still has their own dev slot", () => {
  const playerTwo = { ...player, id: "p2", name: "Player Two" };
  const active = [
    {
      ...unit(PRODUCT_KEYS.STAR, "p1"),
      season: 1,
      discordId: "u1",
      teamSlug: "cardinals",
    },
  ];
  const result = validateOrderUnits({
    units: [unit(PRODUCT_KEYS.STAR, "p2")],
    activeLines: active,
    season: 1,
    discordId: "u2",
    teamSlug: "ravens",
    playersById: new Map([["p2", playerTwo]]),
  });

  assert.deepEqual(result, { ok: true });
});

test("team dev cap resets next season", () => {
  const active = [
    {
      ...unit(PRODUCT_KEYS.XFACTOR),
      season: 1,
      discordId: "u1",
      teamSlug: "cardinals",
    },
  ];
  const result = validateOrderUnits({
    units: [unit(PRODUCT_KEYS.XFACTOR)],
    activeLines: active,
    season: 2,
    discordId: "u1",
    teamSlug: "cardinals",
    playersById: new Map([["p1", player]]),
  });
  assert.deepEqual(result, { ok: true });
});

test("non-physical is limited to six per player per season", () => {
  const active = Array.from({ length: 6 }, () => ({
    ...unit(PRODUCT_KEYS.NON_PHYSICAL, "p1", "catching"),
    season: 1,
  }));
  const result = validateOrderUnits({
    units: [unit(PRODUCT_KEYS.NON_PHYSICAL, "p1", "routeRunning")],
    activeLines: active,
    season: 1,
    discordId: "u1",
    teamSlug: "cardinals",
    playersById: new Map([["p1", player]]),
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /6 \/ 6/);
});

test("physical is limited to three per player for the franchise", () => {
  const active = [
    { ...unit(PRODUCT_KEYS.PHYSICAL, "p1", "speed"), season: 1 },
    { ...unit(PRODUCT_KEYS.PHYSICAL, "p1", "acceleration"), season: 1 },
    { ...unit(PRODUCT_KEYS.PHYSICAL, "p1", "speed"), season: 2 },
  ];
  const result = validateOrderUnits({
    units: [unit(PRODUCT_KEYS.PHYSICAL, "p1", "acceleration")],
    activeLines: active,
    season: 3,
    discordId: "u1",
    teamSlug: "cardinals",
    playersById: new Map([["p1", player]]),
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /3 \/ 3/);
});

test("an order can contain only one free physical", () => {
  const result = validateOrderUnits({
    units: [
      unit(PRODUCT_KEYS.STAR),
      unit(PRODUCT_KEYS.FREE_PHYSICAL, "p1", "speed"),
      unit(PRODUCT_KEYS.FREE_PHYSICAL, "p1", "acceleration"),
    ],
    activeLines: [],
    season: 1,
    discordId: "u1",
    teamSlug: "cardinals",
    playersById: new Map([["p1", player]]),
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /only one free physical/i);
});

test("free physical requires a paid dev in that order", () => {
  const result = validateOrderUnits({
    units: [unit(PRODUCT_KEYS.FREE_PHYSICAL, "p1", "speed")],
    activeLines: [],
    season: 1,
    discordId: "u1",
    teamSlug: "cardinals",
    playersById: new Map([["p1", player]]),
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /requires a paid Dev/i);
});

test("physical attribute cannot be pushed above 93", () => {
  const high = {
    ...player,
    physicalAttributes: [{ key: "speed", label: "Speed", value: 93 }],
  };
  const result = validateOrderUnits({
    units: [unit(PRODUCT_KEYS.PHYSICAL, "p1", "speed")],
    activeLines: [],
    season: 1,
    discordId: "u1",
    teamSlug: "cardinals",
    playersById: new Map([["p1", high]]),
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /above 93/);
});

test("clipboard format includes user, products, total, order id, and Cash App", () => {
  const text = formatOrderForClipboard(
    {
      discordUsername: "rico",
      displayName: "Rico",
      teamName: "Arizona Cardinals",
      teamSlug: "cardinals",
      season: 1,
      total: 5,
      orderId: "GJ-1-ABC",
      lines: [
        {
          paid: true,
          productName: "Superstar Dev",
          unitPrice: 5,
          playerName: "Player One",
          attributeLabel: null,
        },
        {
          paid: false,
          productName: "+1 Physical Upgrade",
          unitPrice: 0,
          playerName: "Player One",
          attributeLabel: "Speed",
        },
      ],
    },
    "https://cash.app/$ricorips",
  );

  assert.match(text, /GOLD JACKET DEV SHOP ORDER/);
  assert.match(text, /@rico/);
  assert.match(text, /Superstar Dev/);
  assert.match(text, /FREE \+1 Physical Upgrade/);
  assert.match(text, /TOTAL: \$5/);
  assert.match(text, /GJ-1-ABC/);
  assert.match(text, /https:\/\/cash\.app\/\$ricorips/);
});
