import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getOrCreateWallet } from "@/lib/db/wallet";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SavedDiscordUser = {
  id: string;
};

const CATALOG = [
  {
    key: "attribute_plus_one",
    name: "+1 Non-Physical Attribute",
    price: 300,
    description:
      "Add +1 to one eligible non-physical rating.",
    limit: 3,
  },
  {
    key: "attribute_plus_two",
    name: "+2 Non-Physical Attributes",
    price: 500,
    description:
      "Add +2 total points across eligible non-physical ratings.",
    limit: 2,
  },
  {
    key: "breakout_program",
    name: "Breakout Program",
    price: 750,
    description:
      "Unlock one commissioner-approved breakout opportunity.",
    limit: 2,
  },
  {
    key: "normal_to_star",
    name: "Normal → Star",
    price: 1000,
    description:
      "Upgrade one eligible player from Normal to Star development.",
    limit: 1,
  },
  {
    key: "star_to_superstar",
    name: "Star → Superstar",
    price: 1500,
    description:
      "Upgrade one eligible player from Star to Superstar development.",
    limit: 1,
  },
  {
    key: "superstar_to_xfactor",
    name: "Superstar → X-Factor",
    price: 2500,
    description:
      "Upgrade one eligible player from Superstar to X-Factor.",
    limit: 1,
  },
] as const;

function readUser(request: NextRequest): SavedDiscordUser | null {
  try {
    const encoded =
      request.cookies.get("new_era_discord_user")?.value;

    if (!encoded) return null;

    return JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SavedDiscordUser;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = readUser(request);

    if (!user?.id) {
      return NextResponse.json({
        success: true,
        revision: "dev-market-v1",
        authenticated: false,
        catalog: CATALOG,
        wallet: null,
        team: null,
        purchases: [],
      });
    }

    const [wallet, memberResult, purchasesResult] =
      await Promise.all([
        getOrCreateWallet(user.id),

        supabaseAdmin
          .from("members")
          .select("team")
          .eq("discord_id", user.id)
          .maybeSingle(),

        supabaseAdmin
          .from("wallet_transactions")
          .select(
            "id, amount, description, metadata, created_at",
          )
          .eq("discord_id", user.id)
          .eq("type", "dev_market_purchase")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    if (memberResult.error) throw memberResult.error;
    if (purchasesResult.error) throw purchasesResult.error;

    return NextResponse.json({
      success: true,
      revision: "dev-market-v1",
      authenticated: true,
      catalog: CATALOG,
      wallet,
      team: memberResult.data?.team ?? null,
      purchases: purchasesResult.data ?? [],
    });
  } catch (error) {
    console.error("Dev market load failed:", error);

    return NextResponse.json(
      { success: false, error: "Unable to load New Era Market." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = readUser(request);

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Connect Discord first." },
        { status: 401 },
      );
    }

    const body = await request.json();

    const itemKey =
      typeof body.itemKey === "string"
        ? body.itemKey.trim()
        : "";

    const item = CATALOG.find(
      (candidate) => candidate.key === itemKey,
    );

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Invalid market item." },
        { status: 400 },
      );
    }

    const [wallet, memberResult, leagueResult] =
      await Promise.all([
        getOrCreateWallet(user.id),

        supabaseAdmin
          .from("members")
          .select("team")
          .eq("discord_id", user.id)
          .maybeSingle(),

        supabaseAdmin
          .from("leagues")
          .select("season")
          .eq("slug", "new-era-cfm")
          .maybeSingle(),
      ]);

    if (memberResult.error) throw memberResult.error;
    if (leagueResult.error) throw leagueResult.error;

    const team = memberResult.data?.team?.trim();

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your Discord account does not have a New Era team linked.",
        },
        { status: 400 },
      );
    }

    const season = Number(leagueResult.data?.season ?? 1);

    const existingResult = await supabaseAdmin
      .from("wallet_transactions")
      .select("id", { count: "exact" })
      .eq("discord_id", user.id)
      .eq("type", "dev_market_purchase")
      .contains("metadata", {
        itemKey: item.key,
        season,
      });

    if (existingResult.error) throw existingResult.error;

    const purchased = existingResult.count ?? 0;

    if (purchased >= item.limit) {
      return NextResponse.json(
        {
          success: false,
          error: `Season limit reached for ${item.name}.`,
        },
        { status: 400 },
      );
    }

    const oldBalance = Number(wallet.balance ?? 0);

    if (oldBalance < item.price) {
      return NextResponse.json(
        {
          success: false,
          error: "Not enough NE Coin.",
        },
        { status: 400 },
      );
    }

    const newBalance = oldBalance - item.price;

    const walletUpdate = await supabaseAdmin
      .from("wallets")
      .update({
        balance: newBalance,
      })
      .eq("discord_id", user.id);

    if (walletUpdate.error) throw walletUpdate.error;

    const referenceId =
      `dev-market:${season}:${item.key}:${randomUUID()}`;

    const transaction = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        discord_id: user.id,
        amount: -item.price,
        type: "dev_market_purchase",
        reference_id: referenceId,
        description: `New Era Market | ${item.name}`,
        metadata: {
          kind: "dev_market_purchase",
          itemKey: item.key,
          itemName: item.name,
          price: item.price,
          team,
          season,
          status: "pending_fulfillment",
        },
      });

    if (transaction.error) {
      await supabaseAdmin
        .from("wallets")
        .update({ balance: oldBalance })
        .eq("discord_id", user.id);

      throw transaction.error;
    }

    return NextResponse.json({
      success: true,
      item: item.name,
      team,
      price: item.price,
      balance: newBalance,
      status: "pending_fulfillment",
    });
  } catch (error) {
    console.error("Dev market purchase failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to complete purchase.",
      },
      { status: 500 },
    );
  }
}
