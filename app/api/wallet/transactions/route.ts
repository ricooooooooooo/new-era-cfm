import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SavedDiscordUser = {
  id: string;
};

function getDiscordId(request: NextRequest) {
  const encodedUser = request.cookies.get("gold_jacket_discord_user")?.value;
  if (!encodedUser) return null;

  try {
    const decoded = Buffer.from(encodedUser, "base64url").toString("utf8");
    return (JSON.parse(decoded) as SavedDiscordUser).id;
  } catch {
    return null;
  }
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
      .from("wallet_transactions")
      .select("id, amount, type, description, created_at")
      .eq("discord_id", discordId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Failed to load wallet transactions:", error);

    return NextResponse.json(
      { error: "Failed to load transaction history." },
      { status: 500 },
    );
  }
}
