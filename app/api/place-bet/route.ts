import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SavedDiscordUser = {
  id: string;
};

type LinkedGame = {
  id: string;
  status: string;
  scheduled_at: string | null;
};

type MarketRow = {
  id: string;
  status: string;
  closes_at: string | null;
  game_id: string | null;
  prediction_options:
    | { id: string }[]
    | null;
  league_games:
    | LinkedGame
    | LinkedGame[]
    | null;
};

function linkedGame(
  value:
    | LinkedGame
    | LinkedGame[]
    | null,
) {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export async function POST(
  request: NextRequest,
) {
  try {
    const encodedUser =
      request.cookies.get(
        "gold_jacket_discord_user",
      )?.value;

    if (!encodedUser) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        },
      );
    }

    const decodedUser =
      Buffer.from(
        encodedUser,
        "base64url",
      ).toString("utf8");

    const user =
      JSON.parse(
        decodedUser,
      ) as SavedDiscordUser;

    const body =
      await request.json();

    const marketId =
      String(
        body.marketId ?? "",
      );

    const optionId =
      String(
        body.optionId ?? "",
      );

    const amount =
      Number(body.amount);

    if (
      !marketId ||
      !optionId ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid bet.",
        },
        {
          status: 400,
        },
      );
    }

    // IMPORTANT:
    // Check the market/game BEFORE
    // touching the user's wallet.
    const marketResult =
      await supabaseAdmin
        .from(
          "prediction_markets",
        )
        .select(`
          id,
          status,
          closes_at,
          game_id,
          prediction_options (
            id
          ),
          league_games:game_id (
            id,
            status,
            scheduled_at
          )
        `)
        .eq(
          "id",
          marketId,
        )
        .maybeSingle();

    if (marketResult.error) {
      throw marketResult.error;
    }

    if (!marketResult.data) {
      return NextResponse.json(
        {
          error:
            "Prediction market not found.",
        },
        {
          status: 404,
        },
      );
    }

    const market =
      marketResult.data as unknown as MarketRow;

    const game =
      linkedGame(
        market.league_games,
      );

    const now =
      Date.now();

    const closeTimePassed =
      Boolean(
        market.closes_at &&
        new Date(
          market.closes_at,
        ).getTime() <= now,
      );

    const scheduledKickoffPassed =
      Boolean(
        game?.scheduled_at &&
        new Date(
          game.scheduled_at,
        ).getTime() <= now,
      );

    const gameStarted =
      Boolean(
        game &&
        game.status !==
          "scheduled",
      );

    const marketLocked =
      market.status !==
        "open" ||
      closeTimePassed ||
      scheduledKickoffPassed ||
      gameStarted;

    if (marketLocked) {
      // Repair stale "open" state
      // while we're here.
      if (
        market.status ===
        "open"
      ) {
        await supabaseAdmin
          .from(
            "prediction_markets",
          )
          .update({
            status:
              "closed",
          })
          .eq(
            "id",
            market.id,
          );
      }

      return NextResponse.json(
        {
          error:
            gameStarted
              ? "This game has started. Betting is closed."
              : "This prediction market is closed.",
        },
        {
          status: 409,
        },
      );
    }

    const validOption =
      (
        market.prediction_options ??
        []
      ).some(
        (option) =>
          option.id ===
          optionId,
      );

    if (!validOption) {
      return NextResponse.json(
        {
          error:
            "That option does not belong to this market.",
        },
        {
          status: 400,
        },
      );
    }

    const walletResult =
      await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq(
          "discord_id",
          user.id,
        )
        .single();

    if (walletResult.error) {
      throw walletResult.error;
    }

    const wallet =
      walletResult.data;

    if (
      Number(
        wallet.balance ??
          0,
      ) < amount
    ) {
      return NextResponse.json(
        {
          error:
            "Not enough Gold Jacket Credits.",
        },
        {
          status: 400,
        },
      );
    }

    const newBalance =
      Number(
        wallet.balance ??
          0,
      ) - amount;

    const walletUpdate =
      await supabaseAdmin
        .from("wallets")
        .update({
          balance:
            newBalance,
          lifetime_wagered:
            Number(
              wallet.lifetime_wagered ??
                0,
            ) + amount,
        })
        .eq(
          "discord_id",
          user.id,
        );

    if (walletUpdate.error) {
      throw walletUpdate.error;
    }

    const betResult =
      await supabaseAdmin
        .from(
          "prediction_bets",
        )
        .insert({
          discord_id:
            user.id,
          market_id:
            marketId,
          option_id:
            optionId,
          amount,
        });

    if (betResult.error) {
      // Refund wallet if bet write fails.
      await supabaseAdmin
        .from("wallets")
        .update({
          balance:
            Number(
              wallet.balance ??
                0,
            ),
          lifetime_wagered:
            Number(
              wallet.lifetime_wagered ??
                0,
            ),
        })
        .eq(
          "discord_id",
          user.id,
        );

      throw betResult.error;
    }

    const transactionResult =
      await supabaseAdmin
        .from(
          "wallet_transactions",
        )
        .insert({
          discord_id:
            user.id,
          amount:
            -amount,
          type:
            "bet",
          description:
            "Prediction Market Bet",
          reference_id:
            `prediction-bet:${marketId}:${user.id}:${Date.now()}`,
          metadata: {
            marketId,
            optionId,
          },
        });

    if (
      transactionResult.error
    ) {
      throw transactionResult.error;
    }

    return NextResponse.json({
      success: true,
      balance:
        newBalance,
    });
  } catch (error) {
    console.error(
      "Place bet failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to place bet.",
      },
      {
        status: 500,
      },
    );
  }
}
