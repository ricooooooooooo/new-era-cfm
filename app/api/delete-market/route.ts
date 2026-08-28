import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isCommissioner } from "@/lib/auth/permissions";

type SavedDiscordUser = {
  id: string;
};

type DeleteMarketBody = {
  marketId?: unknown;
};

type PredictionBet = {
  discord_id: string;
  amount: number;
};

function readDiscordUser(request: NextRequest): SavedDiscordUser | null {
  try {
    const encodedUser = request.cookies.get("gold_jacket_discord_user")?.value;

    if (!encodedUser) {
      return null;
    }

    const decodedUser = Buffer.from(encodedUser, "base64url").toString("utf8");
    const user = JSON.parse(decodedUser) as SavedDiscordUser;

    return user?.id ? user : null;
  } catch {
    return null;
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = readDiscordUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const allowed = await isCommissioner(user.id);

    if (!allowed) {
      return NextResponse.json(
        { error: "Only an owner or commissioner can delete markets." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as DeleteMarketBody;
    const marketId =
      typeof body.marketId === "string" ? body.marketId.trim() : "";

    if (!marketId) {
      return NextResponse.json(
        { error: "Market ID is required." },
        { status: 400 }
      );
    }

    const { data: market, error: marketError } = await supabaseAdmin
      .from("prediction_markets")
      .select("id, title, status")
      .eq("id", marketId)
      .maybeSingle();

    if (marketError) {
      throw marketError;
    }

    if (!market) {
      return NextResponse.json(
        { error: "Prediction market not found." },
        { status: 404 }
      );
    }

    const { data: betData, error: betsError } = await supabaseAdmin
      .from("prediction_bets")
      .select("discord_id, amount")
      .eq("market_id", marketId);

    if (betsError) {
      throw betsError;
    }

    const bets = (betData ?? []) as PredictionBet[];
    let totalRefunded = 0;
    let refundedBets = 0;

    if (market.status !== "graded") {
      const refundsByUser = new Map<string, number>();

      for (const bet of bets) {
        const amount = Number(bet.amount ?? 0);

        if (amount <= 0) {
          continue;
        }

        refundsByUser.set(
          bet.discord_id,
          (refundsByUser.get(bet.discord_id) ?? 0) + amount
        );

        totalRefunded += amount;
        refundedBets += 1;
      }

      for (const [discordId, refundAmount] of refundsByUser.entries()) {
        const { data: wallet, error: walletError } = await supabaseAdmin
          .from("wallets")
          .select("balance, lifetime_wagered")
          .eq("discord_id", discordId)
          .maybeSingle();

        if (walletError) {
          throw walletError;
        }

        if (!wallet) {
          throw new Error(`Wallet not found for Discord user ${discordId}.`);
        }

        const { error: updateWalletError } = await supabaseAdmin
          .from("wallets")
          .update({
            balance: Number(wallet.balance ?? 0) + refundAmount,
            lifetime_wagered: Math.max(
              0,
              Number(wallet.lifetime_wagered ?? 0) - refundAmount
            ),
          })
          .eq("discord_id", discordId);

        if (updateWalletError) {
          throw updateWalletError;
        }

        const { error: transactionError } = await supabaseAdmin
          .from("wallet_transactions")
          .insert({
            discord_id: discordId,
            amount: refundAmount,
            type: "prediction_refund",
            description: `Prediction refund | Market: ${marketId}`,
          });

        if (transactionError) {
          throw transactionError;
        }
      }
    }

    const { error: deleteBetsError } = await supabaseAdmin
      .from("prediction_bets")
      .delete()
      .eq("market_id", marketId);

    if (deleteBetsError) {
      throw deleteBetsError;
    }

    const { error: deleteOptionsError } = await supabaseAdmin
      .from("prediction_options")
      .delete()
      .eq("market_id", marketId);

    if (deleteOptionsError) {
      throw deleteOptionsError;
    }

    const { error: deleteMarketError } = await supabaseAdmin
      .from("prediction_markets")
      .delete()
      .eq("id", marketId);

    if (deleteMarketError) {
      throw deleteMarketError;
    }

    return NextResponse.json({
      success: true,
      marketId,
      refundedBets,
      totalRefunded,
    });
  } catch (error) {
    console.error("Failed to delete prediction market:", error);

    return NextResponse.json(
      { error: "Failed to delete prediction market." },
      { status: 500 }
    );
  }
}