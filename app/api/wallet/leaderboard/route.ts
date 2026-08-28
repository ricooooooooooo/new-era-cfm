import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type MemberRow = Record<string, unknown> & {
  discord_id?: string;
};

function memberName(member: MemberRow | undefined, discordId: string) {
  if (!member) return `Member ${discordId.slice(-4)}`;

  const possibleNames = [
    member.display_name,
    member.displayName,
    member.discord_name,
    member.discord_username,
    member.username,
    member.name,
  ];

  const match = possibleNames.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  return typeof match === "string" ? match : `Member ${discordId.slice(-4)}`;
}

export async function GET() {
  try {
    const walletsResult = await supabaseAdmin
      .from("wallets")
      .select("discord_id, balance, lifetime_won, lifetime_wagered")
      .order("balance", { ascending: false })
      .limit(100);

    if (walletsResult.error) throw walletsResult.error;

    const wallets = walletsResult.data ?? [];
    const discordIds = wallets.map((wallet) => wallet.discord_id);

    let members: MemberRow[] = [];

    if (discordIds.length > 0) {
      const membersResult = await supabaseAdmin
        .from("members")
        .select("*")
        .in("discord_id", discordIds);

      if (membersResult.error) {
        console.error("Leaderboard member lookup failed:", membersResult.error);
      } else {
        members = (membersResult.data ?? []) as MemberRow[];
      }
    }

    const membersByDiscordId = new Map(
      members
        .filter((member) => typeof member.discord_id === "string")
        .map((member) => [member.discord_id as string, member]),
    );

    const leaderboard = wallets.map((wallet, index) => ({
      rank: index + 1,
      discord_id: wallet.discord_id,
      name: memberName(
        membersByDiscordId.get(wallet.discord_id),
        wallet.discord_id,
      ),
      balance: Number(wallet.balance ?? 0),
      lifetime_won: Number(wallet.lifetime_won ?? 0),
      lifetime_wagered: Number(wallet.lifetime_wagered ?? 0),
    }));

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Failed to load Gold Jacket Credits leaderboard:", error);

    return NextResponse.json(
      { error: "Failed to load leaderboard." },
      { status: 500 },
    );
  }
}
