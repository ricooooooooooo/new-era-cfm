import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isCommissioner } from "@/lib/auth/permissions";

type SavedDiscordUser = {
  id: string;
};

type PredictionMarket = {
  id: string;
  title: string;
  status: string;
  winning_option: string | null;
};

type PredictionBet = {
  id: string;
  market_id: string;
  option_id: string;
  discord_id: string;
  amount: number;
};

type Wallet = {
  discord_id: string;
  balance: number;
  lifetime_won: number;
  lifetime_wagered: number;
};

function readDiscordUser(request: NextRequest): SavedDiscordUser | null {
  try {
    const encodedUser = request.cookies.get("new_era_discord_user")?.value;

    if (!encodedUser) {
      return null;
    }

    const decodedUser = Buffer.from(encodedUser, "base64url").toString("utf8");
    const user = JSON.parse(decodedUser) as SavedDiscordUser;

    if (!user?.id) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = readDiscordUser(request);

    if (!user) {
      return NextResponse.json(
        {
          error: "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    const allowed = await isCommissioner(user.id);

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Only an owner or commissioner can grade markets.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const marketId = String(body.marketId ?? "").trim();
    const winningOptionId = String(body.optionId ?? "").trim();

    if (!marketId || !winningOptionId) {
      return NextResponse.json(
        {
          error: "Market ID and winning option ID are required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: marketData, error: marketError } = await supabaseAdmin
      .from("prediction_markets")
      .select("id, title, status, winning_option")
      .eq("id", marketId)
      .maybeSingle();

    if (marketError) {
      throw marketError;
    }

    const market = marketData as PredictionMarket | null;

    if (!market) {
      return NextResponse.json(
        {
          error: "Prediction market not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (market.status === "graded") {
      return NextResponse.json(
        {
          error: "This market has already been graded and paid.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: optionData, error: optionError } = await supabaseAdmin
      .from("prediction_options")
      .select("id, market_id, label")
      .eq("id", winningOptionId)
      .eq("market_id", marketId)
      .maybeSingle();

    if (optionError) {
      throw optionError;
    }

    if (!optionData) {
      return NextResponse.json(
        {
          error: "That option does not belong to this market.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: winningBetsData, error: betsError } = await supabaseAdmin
      .from("prediction_bets")
      .select("id, market_id, option_id, discord_id, amount")
      .eq("market_id", marketId)
      .eq("option_id", winningOptionId);

    if (betsError) {
      throw betsError;
    }

    const winningBets = (winningBetsData ?? []) as PredictionBet[];

    let totalPaid = 0;
    let paidBets = 0;
    let skippedBets = 0;

    for (const bet of winningBets) {
      const payout = bet.amount * 2;
      const transactionDescription = `Prediction payout | Market: ${marketId} | Bet: ${bet.id}`;

      const { data: existingTransaction, error: transactionCheckError } =
        await supabaseAdmin
          .from("wallet_transactions")
          .select("id")
          .eq("discord_id", bet.discord_id)
          .eq("type", "prediction_payout")
          .eq("description", transactionDescription)
          .maybeSingle();

      if (transactionCheckError) {
        throw transactionCheckError;
      }

      if (existingTransaction) {
        skippedBets += 1;
        continue;
      }

      const { data: walletData, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select(
          "discord_id, balance, lifetime_won, lifetime_wagered"
        )
        .eq("discord_id", bet.discord_id)
        .maybeSingle();

      if (walletError) {
        throw walletError;
      }

      let wallet = walletData as Wallet | null;

      if (!wallet) {
        const { data: createdWallet, error: createWalletError } =
          await supabaseAdmin
            .from("wallets")
            .insert({
              discord_id: bet.discord_id,
              balance: 5000,
              lifetime_won: 0,
              lifetime_wagered: 0,
            })
            .select(
              "discord_id, balance, lifetime_won, lifetime_wagered"
            )
            .single();

        if (createWalletError) {
          throw createWalletError;
        }

        wallet = createdWallet as Wallet;
      }

      const newBalance = wallet.balance + payout;
      const newLifetimeWon = wallet.lifetime_won + payout;

      const { error: updateWalletError } = await supabaseAdmin
        .from("wallets")
        .update({
          balance: newBalance,
          lifetime_won: newLifetimeWon,
        })
        .eq("discord_id", bet.discord_id);

      if (updateWalletError) {
        throw updateWalletError;
      }

      const { error: transactionError } = await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          discord_id: bet.discord_id,
          amount: payout,
          type: "prediction_payout",
          description: transactionDescription,
        });

      if (transactionError) {
        await supabaseAdmin
          .from("wallets")
          .update({
            balance: wallet.balance,
            lifetime_won: wallet.lifetime_won,
          })
          .eq("discord_id", bet.discord_id);

        throw transactionError;
      }

      totalPaid += payout;
      paidBets += 1;
    }

    const { error: gradeError } = await supabaseAdmin
      .from("prediction_markets")
      .update({
        status: "graded",
        winning_option: winningOptionId,
      })
      .eq("id", marketId);

    if (gradeError) {
      throw gradeError;
    }

    return NextResponse.json({
      success: true,
      message: "Market graded and winning bettors paid.",
      marketId,
      winningOptionId,
      winningOption: optionData.label,
      winningBets: winningBets.length,
      paidBets,
      skippedBets,
      totalPaid,
    });
  } catch (error) {
    console.error("Failed to grade prediction market:", error);

    return NextResponse.json(
      {
        error: "Failed to grade and pay this market.",
      },
      {
        status: 500,
      }
    );
  }
}