function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parseOrderPayload(payload) {
  const record = asObject(payload);
  if (!record || record.kind !== "gold_jacket_dev_shop_order") return null;

  const orderId = asString(record.orderId);
  const checkoutToken = asString(record.checkoutToken);
  const discordId = asString(record.discordId);
  const lines = Array.isArray(record.lines) ? record.lines : [];

  if (!orderId || !checkoutToken || !discordId || lines.length === 0) {
    return null;
  }

  const parsedLines = lines
    .map((line) => {
      const item = asObject(line);
      if (!item) return null;

      const productKey = asString(item.productKey);
      const playerId = asString(item.playerId);
      const playerName = asString(item.playerName);

      if (!productKey || !playerId || !playerName) return null;

      return {
        lineId: asString(item.lineId),
        productKey,
        productName: asString(item.productName),
        paid: item.paid !== false,
        unitPrice: asNumber(item.unitPrice),
        playerId,
        playerName,
        attributeKey: asString(item.attributeKey) || null,
        attributeLabel: asString(item.attributeLabel) || null,
      };
    })
    .filter(Boolean);

  if (parsedLines.length === 0) return null;

  return {
    orderId,
    checkoutToken,
    discordId,
    discordUsername: asString(record.discordUsername),
    displayName: asString(record.displayName),
    teamSlug: asString(record.teamSlug) || null,
    teamName: asString(record.teamName) || null,
    leagueId: asString(record.leagueId) || null,
    season: Math.max(1, Math.trunc(asNumber(record.season) || 1)),
    total: asNumber(record.total),
    createdAt: asString(record.createdAt),
    lines: parsedLines,
  };
}

function parseVoidPayload(payload) {
  const record = asObject(payload);
  if (!record || record.kind !== "gold_jacket_dev_shop_order_void") return null;
  const orderId = asString(record.orderId);
  if (!orderId) return null;

  return {
    orderId,
    voidedAt: asString(record.voidedAt),
    voidedByDiscordId: asString(record.voidedByDiscordId),
    reason: asString(record.reason) || null,
  };
}

export function buildOrderLedger(rows) {
  const sorted = [...rows].sort((a, b) => {
    const at = asString(a.received_at);
    const bt = asString(b.received_at);
    const timeCompare = at.localeCompare(bt);
    if (timeCompare !== 0) return timeCompare;
    return asString(a.id).localeCompare(asString(b.id));
  });

  const ordersById = new Map();
  const orderIdByCheckoutToken = new Map();
  const voidsByOrderId = new Map();

  for (const row of sorted) {
    if (row.export_type === "dev_shop_order") {
      const order = parseOrderPayload(row.payload);
      if (!order) continue;

      if (orderIdByCheckoutToken.has(order.checkoutToken)) {
        continue;
      }

      if (!ordersById.has(order.orderId)) {
        ordersById.set(order.orderId, {
          ...order,
          storageId: asString(row.id),
          receivedAt: asString(row.received_at),
        });
        orderIdByCheckoutToken.set(order.checkoutToken, order.orderId);
      }
      continue;
    }

    if (row.export_type === "dev_shop_order_void") {
      const voidEvent = parseVoidPayload(row.payload);
      if (!voidEvent) continue;
      voidsByOrderId.set(voidEvent.orderId, {
        ...voidEvent,
        storageId: asString(row.id),
        receivedAt: asString(row.received_at),
      });
    }
  }

  return [...ordersById.values()].map((order) => {
    const voidEvent = voidsByOrderId.get(order.orderId) ?? null;
    return {
      ...order,
      voided: Boolean(voidEvent),
      voidEvent,
    };
  });
}

export function flattenActiveLines(orders) {
  return orders
    .filter((order) => !order.voided)
    .flatMap((order) =>
      order.lines.map((line) => ({
        ...line,
        orderId: order.orderId,
        discordId: order.discordId,
        season: order.season,
        leagueId: order.leagueId,
        createdAt: order.createdAt || order.receivedAt,
      })),
    );
}

export function findOrderByCheckoutToken(orders, checkoutToken, discordId) {
  return (
    orders.find(
      (order) =>
        order.checkoutToken === checkoutToken &&
        order.discordId === discordId,
    ) ?? null
  );
}

export function findOrderById(orders, orderId) {
  return orders.find((order) => order.orderId === orderId) ?? null;
}
