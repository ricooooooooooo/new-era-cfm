import { NextRequest, NextResponse } from "next/server";

import { getOrCreateWallet } from "@/lib/db/wallet";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WELCOME_REWARD = 100;
const LEGACY_STARTING_BALANCE = 500;

type SavedDiscordUser = {
  id: string;
};

function getDiscordId(request: NextRequest) {
  try {
    const encoded =
      request.cookies.get("new_era_discord_user")?.value;

    if (!encoded) return null;

    const decoded = Buffer.from(
      encoded,
      "base64url",
    ).toString("utf8");

    const user = JSON.parse(decoded) as SavedDiscordUser;

    return user?.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

async function alreadyClaimed(discordId: string) {
  const result = await supabaseAdmin
    .from("wallet_transactions")
    .select("id")
    .eq("discord_id", discordId)
    .eq("type", "welcome_claim")
    .limit(1);

  if (result.error) throw result.error;

  return (result.data ?? []).length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const discordId = getDiscordId(request);

    if (!discordId) {
      return NextResponse.json({
        success: true,
        revision: "welcome-claim-v1",
        authenticated: false,
        canClaim: false,
        reward: WELCOME_REWARD,
      });
    }

    const [wallet, claimed] = await Promise.all([
      getOrCreateWallet(discordId),
      alreadyClaimed(discordId),
    ]);

    return NextResponse.json({
      success: true,
      revision: "welcome-claim-v1",
      authenticated: true,
      canClaim: !claimed,
      reward: WELCOME_REWARD,
      balance: Number(wallet.balance ?? 0),
    });
  } catch (error) {
    console.error("Welcome claim status failed:", error);

    return NextResponse.json(
      {
        success: false,
        revision: "welcome-claim-v1",
        error: "Unable to load starter claim.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const discordId = getDiscordId(request);

  if (!discordId) {
    return NextResponse.json(
      {
        success: false,
        error: "Connect Discord first.",
      },
      { status: 401 },
    );
  }

  try {
    if (await alreadyClaimed(discordId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Starter NE Coin already claimed.",
        },
        { status: 409 },
      );
    }

    const wallet = await getOrCreateWallet(discordId);

    // PRE-LAUNCH ECONOMY RESET:
    // The first welcome claim always sets the owner to exactly
    // the starter amount, regardless of old test bets/refunds.
    const oldBalance = Number(wallet.balance ?? 0);
    const newBalance = WELCOME_REWARD;

    const walletUpdate = await supabaseAdmin
      .from("wallets")
      .update({
        balance: newBalance,
      })
      .eq("discord_id", discordId);

    if (walletUpdate.error) {
      throw walletUpdate.error;
    }

    const transaction = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        discord_id: discordId,
        amount: WELCOME_REWARD,
        type: "welcome_claim",
        reference_id: `welcome:${discordId}`,
        description: "New Era Welcome Claim",
        metadata: {
          kind: "welcome_claim",
          reward: WELCOME_REWARD,
          preLaunchBalanceReset: true,
          previousBalance: oldBalance,
        },
      });

    if (transaction.error) {
      // Restore balance if transaction logging fails.
      await supabaseAdmin
        .from("wallets")
        .update({
          balance: oldBalance,
        })
        .eq("discord_id", discordId);

      throw transaction.error;
    }

    return NextResponse.json({
      success: true,
      revision: "welcome-claim-v1",
      amount: WELCOME_REWARD,
      balance: newBalance,
    });
  } catch (error) {
    console.error("Welcome claim failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to claim starter NE Coin.",
      },
      { status: 500 },
    );
  }
}
