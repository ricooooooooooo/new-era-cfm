import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SavedDiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

const STARTING_BALANCE = 500;

function readDiscordUser(request: NextRequest): SavedDiscordUser | null {
  const encodedUser = request.cookies.get("new_era_discord_user")?.value;
  if (!encodedUser) return null;

  try {
    const decodedUser = Buffer.from(encodedUser, "base64url").toString("utf8");
    return JSON.parse(decodedUser) as SavedDiscordUser;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const user = readDiscordUser(request);

  if (!user) {
    return NextResponse.json(
      { error: "Not connected to Discord." },
      { status: 401 },
    );
  }

  try {
    const existing = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("discord_id", user.id)
      .maybeSingle();

    if (existing.error) throw existing.error;

    if (existing.data) {
      return NextResponse.json(existing.data);
    }

    const created = await supabaseAdmin
      .from("wallets")
      .insert({
        discord_id: user.id,
        balance: STARTING_BALANCE,
        lifetime_won: 0,
        lifetime_wagered: 0,
      })
      .select("*")
      .single();

    if (created.error) {
      // Another request may have created the wallet at the same time.
      if (created.error.code === "23505") {
        const retry = await supabaseAdmin
          .from("wallets")
          .select("*")
          .eq("discord_id", user.id)
          .single();

        if (retry.error) throw retry.error;
        return NextResponse.json(retry.data);
      }

      throw created.error;
    }

    const welcomeTransaction = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        discord_id: user.id,
        amount: STARTING_BALANCE,
        type: "welcome_bonus",
        description: "New Era welcome balance",
      });

    if (welcomeTransaction.error) {
      console.error(
        "Wallet created, but welcome transaction failed:",
        welcomeTransaction.error,
      );
    }

    return NextResponse.json(created.data);
  } catch (error) {
    console.error("Failed to load wallet:", error);

    return NextResponse.json(
      { error: "Failed to load wallet." },
      { status: 500 },
    );
  }
}
