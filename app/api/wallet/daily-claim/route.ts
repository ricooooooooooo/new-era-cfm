import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SavedDiscordUser = {
  id: string;
};

const DAILY_REWARD = 25;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function getDiscordId(request: NextRequest) {
  const encodedUser = request.cookies.get("new_era_discord_user")?.value;
  if (!encodedUser) return null;

  try {
    const decoded = Buffer.from(encodedUser, "base64url").toString("utf8");
    return (JSON.parse(decoded) as SavedDiscordUser).id;
  } catch {
    return null;
  }
}

function getClaimStatus(lastClaimedAt?: string | null) {
  if (!lastClaimedAt) {
    return {
      canClaim: true,
      nextClaimAt: null,
      remainingMs: 0,
      reward: DAILY_REWARD,
    };
  }

  const nextClaimTime = new Date(lastClaimedAt).getTime() + COOLDOWN_MS;
  const remainingMs = Math.max(0, nextClaimTime - Date.now());

  return {
    canClaim: remainingMs === 0,
    nextClaimAt: new Date(nextClaimTime).toISOString(),
    remainingMs,
    reward: DAILY_REWARD,
  };
}

export async function GET(request: NextRequest) {
  const discordId = getDiscordId(request);

  if (!discordId) {
    return NextResponse.json(
      { error: "Not connected to Discord." },
      { status: 401 },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("daily_claims")
      .select("last_claimed_at")
      .eq("discord_id", discordId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(getClaimStatus(data?.last_claimed_at));
  } catch (error) {
    console.error("Failed to load daily claim:", error);

    return NextResponse.json(
      { error: "Failed to load daily claim." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const discordId = getDiscordId(request);

  if (!discordId) {
    return NextResponse.json(
      { error: "Not connected to Discord." },
      { status: 401 },
    );
  }

  try {
    const currentClaim = await supabaseAdmin
      .from("daily_claims")
      .select("last_claimed_at")
      .eq("discord_id", discordId)
      .maybeSingle();

    if (currentClaim.error) throw currentClaim.error;

    const status = getClaimStatus(currentClaim.data?.last_claimed_at);

    if (!status.canClaim) {
      return NextResponse.json(
        {
          error: "Daily reward is still on cooldown.",
          ...status,
        },
        { status: 409 },
      );
    }

    const walletResult = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("discord_id", discordId)
      .single();

    if (walletResult.error) throw walletResult.error;

    const newBalance = Number(walletResult.data.balance ?? 0) + DAILY_REWARD;
    const claimedAt = new Date().toISOString();

    const claimResult = await supabaseAdmin
      .from("daily_claims")
      .upsert(
        {
          discord_id: discordId,
          last_claimed_at: claimedAt,
        },
        { onConflict: "discord_id" },
      );

    if (claimResult.error) throw claimResult.error;

    const walletUpdate = await supabaseAdmin
      .from("wallets")
      .update({ balance: newBalance })
      .eq("discord_id", discordId);

    if (walletUpdate.error) throw walletUpdate.error;

    const transactionResult = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        discord_id: discordId,
        amount: DAILY_REWARD,
        type: "daily_claim",
        description: "Daily NE Coin claim",
      });

    if (transactionResult.error) {
      console.error(
        "Daily claim paid, but transaction log failed:",
        transactionResult.error,
      );
    }

    return NextResponse.json({
      success: true,
      amount: DAILY_REWARD,
      balance: newBalance,
      ...getClaimStatus(claimedAt),
    });
  } catch (error) {
    console.error("Failed to claim daily reward:", error);

    return NextResponse.json(
      { error: "Failed to claim daily reward." },
      { status: 500 },
    );
  }
}
