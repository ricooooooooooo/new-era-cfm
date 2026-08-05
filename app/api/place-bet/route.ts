import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SavedDiscordUser = {
  id: string;
};

function readUser(request: NextRequest): SavedDiscordUser | null {
  try {
    const encoded = request.cookies.get("new_era_discord_user")?.value;
    if (!encoded) return null;

    return JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SavedDiscordUser;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = readUser(request);

    if (!user?.id) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const marketId =
      typeof body.marketId === "string" ? body.marketId.trim() : "";
    const optionId =
      typeof body.optionId === "string" ? body.optionId.trim() : "";
    const amount = Number(body.amount);

    if (
      !marketId ||
      !optionId ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        { error: "Enter a valid whole-number bet." },
        { status: 400 },
      );
    }

    const marketResult = await supabaseAdmin
      .from("prediction_markets")
      .select("id, status, closes_at")
      .eq("id", marketId)
      .maybeSingle();

    if (marketResult.error) throw marketResult.error;

    if (!marketResult.data || marketResult.data.status !== "open") {
      return NextResponse.json(
        { error: "This market is not open." },
        { status: 400 },
      );
    }

    if (
      marketResult.data.closes_at &&
      new Date(marketResult.data.closes_at).getTime() <= Date.now()
    ) {
      await supabaseAdmin
        .from("prediction_markets")
        .update({ status: "closed" })
        .eq("id", marketId);

      return NextResponse.json(
        { error: "Betting has closed for this market." },
        { status: 400 },
      );
    }

    const optionResult = await supabaseAdmin
      .from("prediction_options")
      .select("id")
      .eq("id", optionId)
      .eq("market_id", marketId)
      .maybeSingle();

    if (optionResult.error) throw optionResult.error;

    if (!optionResult.data) {
      return NextResponse.json(
        { error: "That option does not belong to this market." },
        { status: 400 },
      );
    }

    const walletResult = await supabaseAdmin
      .from("wallets")
      .select("balance, lifetime_wagered")
      .eq("discord_id", user.id)
      .maybeSingle();

    if (walletResult.error) throw walletResult.error;

    if (!walletResult.data) {
      return NextResponse.json(
        { error: "Open your wallet once before placing a bet." },
        { status: 400 },
      );
    }

    if (Number(walletResult.data.balance ?? 0) < amount) {
      return NextResponse.json(
        { error: "Not enough NE Coin." },
        { status: 400 },
      );
    }

    const newBalance = Number(walletResult.data.balance) - amount;

    const walletUpdate = await supabaseAdmin
      .from("wallets")
      .update({
        balance: newBalance,
        lifetime_wagered:
          Number(walletResult.data.lifetime_wagered ?? 0) + amount,
      })
      .eq("discord_id", user.id);

    if (walletUpdate.error) throw walletUpdate.error;

    const betResult = await supabaseAdmin
      .from("prediction_bets")
      .insert({
        discord_id: user.id,
        market_id: marketId,
        option_id: optionId,
        amount,
        result: "pending",
        payout: 0,
      })
      .select("id")
      .single();

    if (betResult.error) throw betResult.error;

    const transactionResult = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        discord_id: user.id,
        amount: -amount,
        type: "bet",
        reference_id: `prediction-bet:${betResult.data.id}`,
        description: "Prediction Market Bet",
        metadata: {
          marketId,
          optionId,
          betId: betResult.data.id,
        },
      });

    if (transactionResult.error) throw transactionResult.error;

    return NextResponse.json({
      success: true,
      balance: newBalance,
      betId: betResult.data.id,
    });
  } catch (error) {
    console.error("Failed to place prediction bet:", error);

    return NextResponse.json(
      { error: "Failed to place bet." },
      { status: 500 },
    );
  }
}
