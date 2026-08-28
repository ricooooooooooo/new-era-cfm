import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import {
  PRODUCT_KEYS,
  getPaidProduct,
  isDevProductKey,
} from "@/lib/dev-shop/catalog.mjs";
import {
  flattenActiveLines,
  findOrderByCheckoutToken,
} from "@/lib/dev-shop/ledger.mjs";
import { formatOrderForClipboard } from "@/lib/dev-shop/order-format.mjs";
import { validateOrderUnits } from "@/lib/dev-shop/caps.mjs";
import {
  CASH_APP_URL,
  COMMISSIONER_DISCORD_URL,
  DEV_SHOP_SOURCE,
  loadDevShopLedger,
  loadGoldJacketLeague,
  loadMemberTeam,
  loadTeamPlayers,
  readDiscordUser,
  type StorePlayer,
} from "@/lib/dev-shop/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestedItem = {
  productKey?: unknown;
  playerId?: unknown;
  attributeKey?: unknown;
};

type CheckoutBody = {
  checkoutToken?: unknown;
  items?: unknown;
  freePhysical?: unknown;
};

function cleanString(value: unknown, maxLength = 120) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function attributeForPlayer(
  player: StorePlayer,
  productKey: string,
  requestedKey: string,
) {
  if (!requestedKey) return null;

  const source =
    productKey === PRODUCT_KEYS.NON_PHYSICAL
      ? player.nonPhysicalAttributes
      : player.physicalAttributes;

  const normalized = requestedKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  return (
    source.find(
      (attribute) =>
        attribute.key.toLowerCase().replace(/[^a-z0-9]+/g, "") === normalized,
    ) ?? null
  );
}

function buildReceipt(order: {
  orderId: string;
  checkoutToken: string;
  discordId: string;
  discordUsername: string;
  displayName: string;
  teamSlug: string | null;
  teamName: string | null;
  leagueId: string | null;
  season: number;
  total: number;
  createdAt: string;
  lines: Array<{
    lineId: string;
    productKey: string;
    productName: string;
    paid: boolean;
    unitPrice: number;
    playerId: string;
    playerName: string;
    attributeKey: string | null;
    attributeLabel: string | null;
  }>;
}) {
  return {
    ...order,
    cashAppUrl: CASH_APP_URL,
    commissionerDiscordUrl: COMMISSIONER_DISCORD_URL,
    clipboardText: formatOrderForClipboard(order, CASH_APP_URL),
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = readDiscordUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Connect Discord before purchasing." },
        { status: 401 },
      );
    }

    let body: CheckoutBody;
    try {
      body = (await request.json()) as CheckoutBody;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid checkout request." },
        { status: 400 },
      );
    }

    const checkoutToken = cleanString(body.checkoutToken, 100);
    if (checkoutToken.length < 8) {
      return NextResponse.json(
        { success: false, error: "Invalid checkout token." },
        { status: 400 },
      );
    }

    const ledger = await loadDevShopLedger();
    const existing = findOrderByCheckoutToken(
      ledger,
      checkoutToken,
      user.id,
    );

    if (existing) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        order: buildReceipt(existing),
      });
    }

    const [league, memberContext] = await Promise.all([
      loadGoldJacketLeague(),
      loadMemberTeam(user.id),
    ]);

    if (!memberContext.team) {
      return NextResponse.json(
        {
          success: false,
          error: "Your Discord account does not have a team linked yet.",
        },
        { status: 400 },
      );
    }

    const season = Math.max(1, Number(league?.season ?? 1));
    const players = await loadTeamPlayers({
      leagueId: league?.id ?? null,
      teamAbbreviation: memberContext.team.abbreviation,
    });
    const playersById = new Map(players.map((player) => [player.id, player]));

    const requestedItems = Array.isArray(body.items)
      ? (body.items as RequestedItem[])
      : [];

    if (requestedItems.length === 0 || requestedItems.length > 30) {
      return NextResponse.json(
        {
          success: false,
          error: "Your order must contain between 1 and 30 paid items.",
        },
        { status: 400 },
      );
    }

    const units = [];

    for (const requested of requestedItems) {
      const productKey = cleanString(requested.productKey, 80);
      const product = getPaidProduct(productKey);

      if (!product) {
        return NextResponse.json(
          { success: false, error: "Invalid Dev Shop product." },
          { status: 400 },
        );
      }

      const playerId = cleanString(requested.playerId, 120);
      const player = playersById.get(playerId);

      if (!player) {
        return NextResponse.json(
          {
            success: false,
            error: "Every upgrade must be assigned to a player on your roster.",
          },
          { status: 400 },
        );
      }

      const requestedAttribute = cleanString(requested.attributeKey, 120);
      const attribute =
        product.kind === "dev"
          ? null
          : attributeForPlayer(player, productKey, requestedAttribute);

      units.push({
        lineId: randomUUID(),
        productKey: product.key,
        productName: product.name,
        paid: true,
        unitPrice: product.price,
        playerId: player.id,
        playerName: player.name,
        attributeKey: (attribute?.key ?? requestedAttribute) || null,
        attributeLabel: attribute?.label ?? null,
      });
    }

    const hasPaidDev = units.some((unit) => isDevProductKey(unit.productKey));
    const freeRequest =
      body.freePhysical &&
      typeof body.freePhysical === "object" &&
      !Array.isArray(body.freePhysical)
        ? (body.freePhysical as RequestedItem)
        : null;

    if (hasPaidDev && !freeRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Choose the one free physical upgrade included with your Dev purchase.",
        },
        { status: 400 },
      );
    }

    if (freeRequest) {
      if (!hasPaidDev) {
        return NextResponse.json(
          {
            success: false,
            error: "The free physical upgrade requires a paid Dev purchase.",
          },
          { status: 400 },
        );
      }

      const playerId = cleanString(freeRequest.playerId, 120);
      const player = playersById.get(playerId);
      const requestedAttribute = cleanString(freeRequest.attributeKey, 120);

      if (!player) {
        return NextResponse.json(
          {
            success: false,
            error: "Choose a roster player for the free physical upgrade.",
          },
          { status: 400 },
        );
      }

      const attribute = attributeForPlayer(
        player,
        PRODUCT_KEYS.PHYSICAL,
        requestedAttribute,
      );

      units.push({
        lineId: randomUUID(),
        productKey: PRODUCT_KEYS.FREE_PHYSICAL,
        productName: "+1 Physical Upgrade",
        paid: false,
        unitPrice: 0,
        playerId: player.id,
        playerName: player.name,
        attributeKey: (attribute?.key ?? requestedAttribute) || null,
        attributeLabel: attribute?.label ?? null,
      });
    }

    const activeLines = flattenActiveLines(ledger);
    const validation = validateOrderUnits({
      units,
      activeLines,
      season,
      discordId: user.id,
      teamSlug: memberContext.team.slug,
      playersById,
    });

    if (!validation.ok) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 409 },
      );
    }

    const total = units.reduce(
      (sum, unit) => sum + (unit.paid ? Number(unit.unitPrice) : 0),
      0,
    );

    const createdAt = new Date().toISOString();
    const orderId =
      `GJ-S${season}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

    const order = {
      kind: "gold_jacket_dev_shop_order",
      orderId,
      checkoutToken,
      discordId: user.id,
      discordUsername: user.username,
      displayName: user.displayName,
      teamSlug: memberContext.team.slug,
      teamName: memberContext.team.fullName,
      leagueId: league?.id ?? null,
      season,
      total,
      createdAt,
      lines: units,
    };

    const { error: insertError } = await supabaseAdmin
      .from("league_syncs")
      .insert({
        source: DEV_SHOP_SOURCE,
        export_type: "dev_shop_order",
        status: "completed",
        payload: order,
        payload_type: "object",
        top_level_keys: Object.keys(order),
        item_count: units.length,
        request_headers: {
          system: "gold-jacket-dev-shop",
          user_agent: request.headers.get("user-agent"),
        },
        processed_at: createdAt,
      });

    if (insertError) throw insertError;

    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        order: buildReceipt(order),
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Gold Jacket Dev Shop checkout failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to complete the purchase.",
      },
      { status: 500 },
    );
  }
}
