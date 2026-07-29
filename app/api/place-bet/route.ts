import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SavedDiscordUser = {
  id: string;
};

export async function POST(request: NextRequest) {
  try {
    const encodedUser = request.cookies.get("new_era_discord_user")?.value;

    if (!encodedUser) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const decodedUser = Buffer.from(encodedUser, "base64url").toString("utf8");
    const user = JSON.parse(decodedUser) as SavedDiscordUser;

    const body = await request.json();

    const marketId = body.marketId;
    const optionId = body.optionId;
    const amount = Number(body.amount);

    if (!marketId || !optionId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid bet." },
        { status: 400 }
      );
    }

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("discord_id", user.id)
      .single();

    if (walletError) throw walletError;

    if (wallet.balance < amount) {
      return NextResponse.json(
        { error: "Not enough NE Coin." },
        { status: 400 }
      );
    }

    const newBalance = wallet.balance - amount;

    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({
        balance: newBalance,
        lifetime_wagered: wallet.lifetime_wagered + amount,
      })
      .eq("discord_id", user.id);

    if (updateError) throw updateError;

    const { error: betError } = await supabaseAdmin
      .from("prediction_bets")
      .insert({
        discord_id: user.id,
        market_id: marketId,
        option_id: optionId,
        amount,
      });

    if (betError) throw betError;

    const { error: transactionError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        discord_id: user.id,
        amount: -amount,
        type: "bet",
        description: "Prediction Market Bet",
      });

    if (transactionError) throw transactionError;

    return NextResponse.json({
      success: true,
      balance: newBalance,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to place bet." },
      { status: 500 }
    );
  }
}