import { NextRequest, NextResponse } from "next/server";
import { getStaffRole } from "@/app/lib/staff";
import { publishPrizePotEmbed } from "@/lib/discord/prize-pot-webhook";
import { isCommissioner } from "@/lib/auth/permissions";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SavedDiscordUser = {
  id: string;
  username?: string;
  displayName?: string;
};

type PrizePotRow = {
  id: string;
  league_id: string | null;
  season: number;
  amount: number;
  teams_filled: number;
  total_teams: number;
  discord_message_id: string | null;
  graphic_version: number;
  last_published_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

function readDiscordUser(request: NextRequest): SavedDiscordUser | null {
  try {
    const encoded = request.cookies.get("new_era_discord_user")?.value;
    if (!encoded) return null;

    const user = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SavedDiscordUser;

    return user?.id ? user : null;
  } catch {
    return null;
  }
}

async function hasCommissionerAccess(discordId: string) {
  if (getStaffRole(discordId)) return true;
  return isCommissioner(discordId);
}

function publicBaseUrl(request: NextRequest) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const productionHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (productionHost) {
    return `https://${productionHost.replace(/^https?:\/\//, "")}`.replace(
      /\/+$/,
      "",
    );
  }

  const origin = request.nextUrl.origin;

  if (!origin.includes("localhost") && !origin.includes("127.0.0.1")) {
    return origin.replace(/\/+$/, "");
  }

  return "https://new-era-cfm.vercel.app";
}

async function getPrizePot(): Promise<PrizePotRow> {
  const existing = await supabaseAdmin
    .from("prize_pot_settings")
    .select("*")
    .eq("id", "new-era")
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    return existing.data as PrizePotRow;
  }

  const leagueResult = await supabaseAdmin
    .from("leagues")
    .select("id")
    .eq("slug", "new-era-cfm")
    .maybeSingle();

  if (leagueResult.error) throw leagueResult.error;

  const inserted = await supabaseAdmin
    .from("prize_pot_settings")
    .insert({
      id: "new-era",
      league_id: leagueResult.data?.id ?? null,
      season: 1,
      amount: 300,
      teams_filled: 32,
      total_teams: 32,
    })
    .select("*")
    .single();

  if (inserted.error) throw inserted.error;

  return inserted.data as PrizePotRow;
}

function serialize(row: PrizePotRow) {
  return {
    id: row.id,
    season: row.season,
    amount: row.amount,
    teamsFilled: row.teams_filled,
    totalTeams: row.total_teams,
    isPublished: Boolean(row.discord_message_id),
    discordMessageId: row.discord_message_id,
    graphicVersion: row.graphic_version,
    lastPublishedAt: row.last_published_at,
    updatedAt: row.updated_at,
    webhookConfigured: Boolean(
      process.env.PRIZE_POT_WEBHOOK_URL?.trim(),
    ),
  };
}

export async function GET() {
  try {
    const row = await getPrizePot();

    return NextResponse.json({
      success: true,
      prizePot: serialize(row),
    });
  } catch (error) {
    console.error("Unable to load prize pot:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load the prize pot.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = readDiscordUser(request);

  if (!user?.id || !(await hasCommissionerAccess(user.id))) {
    return NextResponse.json(
      {
        success: false,
        error: "Commissioner access is required.",
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const season = Number(body.season);
    const teamsFilled = Number(body.teamsFilled);
    const totalTeams = Number(body.totalTeams ?? 32);
    const forceNew = Boolean(body.forceNew);

    if (
      !Number.isInteger(amount) ||
      amount < 0 ||
      amount > 1_000_000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid whole-dollar prize pot.",
        },
        { status: 400 },
      );
    }

    if (!Number.isInteger(season) || season < 1 || season > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid season.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(teamsFilled) ||
      !Number.isInteger(totalTeams) ||
      totalTeams < 1 ||
      teamsFilled < 0 ||
      teamsFilled > totalTeams
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid filled-team count.",
        },
        { status: 400 },
      );
    }

    const existing = await getPrizePot();
    const updatedAt = new Date().toISOString();
    const graphicVersion = Number(existing.graphic_version ?? 0) + 1;

    const saveResult = await supabaseAdmin
      .from("prize_pot_settings")
      .update({
        season,
        amount,
        teams_filled: teamsFilled,
        total_teams: totalTeams,
        graphic_version: graphicVersion,
        updated_by: user.id,
        updated_at: updatedAt,
      })
      .eq("id", "new-era")
      .select("*")
      .single();

    if (saveResult.error) throw saveResult.error;

    const imageParams = new URLSearchParams({
      amount: String(amount),
      season: String(season),
      teams: String(teamsFilled),
      total: String(totalTeams),
      v: String(graphicVersion),
    });

    const imageUrl =
      `${publicBaseUrl(request)}/api/prize-pot/graphic?` +
      imageParams.toString();

    const publication = await publishPrizePotEmbed({
      amount,
      season,
      teamsFilled,
      totalTeams,
      imageUrl,
      existingMessageId: existing.discord_message_id,
      forceNew,
    });

    const publishedAt = new Date().toISOString();

    const publishedResult = await supabaseAdmin
      .from("prize_pot_settings")
      .update({
        discord_message_id: publication.messageId,
        last_published_at: publishedAt,
        updated_at: publishedAt,
      })
      .eq("id", "new-era")
      .select("*")
      .single();

    if (publishedResult.error) throw publishedResult.error;

    return NextResponse.json({
      success: true,
      action: publication.action,
      prizePot: serialize(publishedResult.data as PrizePotRow),
    });
  } catch (error) {
    console.error("Unable to publish prize pot:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update the prize pot.",
      },
      { status: 500 },
    );
  }
}
