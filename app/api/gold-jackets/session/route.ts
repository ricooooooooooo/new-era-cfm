import { NextRequest, NextResponse } from "next/server";
import { readGoldJacketDiscordUser } from "@/lib/gold-jackets/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const user = readGoldJacketDiscordUser(request);

  if (!user) {
    return NextResponse.json({
      connected: false,
      team: null,
      displayName: null,
    });
  }

  const { data: member, error } = await supabaseAdmin
    .from("members")
    .select("team, display_name, discord_username")
    .eq("discord_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load Gold Jacket owner session:", error);
    return NextResponse.json(
      { error: "Unable to load your team assignment." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    connected: true,
    team: member?.team ?? null,
    displayName:
      member?.display_name || member?.discord_username || user.displayName,
  });
}
