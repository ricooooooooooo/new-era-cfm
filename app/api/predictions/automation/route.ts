import { NextRequest, NextResponse } from "next/server";
import { isCommissioner } from "@/lib/auth/permissions";
import { generateMarketsForWeek } from "@/lib/predictions/market-engine";
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

async function requireCommissioner(request: NextRequest) {
  const user = readUser(request);
  if (!user?.id) return false;

  return isCommissioner(user.id);
}

async function getLeague() {
  const result = await supabaseAdmin
    .from("leagues")
    .select("id, season, current_week")
    .eq("slug", "gold-jacket-cfm")
    .maybeSingle();

  if (result.error) throw result.error;
  if (!result.data) throw new Error("NEW ERA league was not found.");

  return result.data;
}

export async function GET(request: NextRequest) {
  if (!(await requireCommissioner(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  try {
    const league = await getLeague();

    const [settingsResult, gamesResult, marketsResult] = await Promise.all([
      supabaseAdmin
        .from("prediction_automation_settings")
        .select("*")
        .eq("league_id", league.id)
        .maybeSingle(),
      supabaseAdmin
        .from("league_games")
        .select("id, status", { count: "exact" })
        .eq("league_id", league.id)
        .eq("season", league.season ?? 1)
        .eq("week", league.current_week ?? 1),
      supabaseAdmin
        .from("prediction_markets")
        .select("id, status", { count: "exact" })
        .eq("league_id", league.id)
        .eq("season", league.season ?? 1)
        .eq("week", league.current_week ?? 1)
        .eq("auto_generated", true),
    ]);

    if (settingsResult.error) throw settingsResult.error;
    if (gamesResult.error) throw gamesResult.error;
    if (marketsResult.error) throw marketsResult.error;

    return NextResponse.json({
      settings:
        settingsResult.data ?? {
          league_id: league.id,
          enabled: true,
          auto_grade: true,
          close_minutes_before: 0,
          templates: ["game_winner"],
          discord_post_enabled: true,
        },
      league: {
        id: league.id,
        season: league.season ?? 1,
        currentWeek: league.current_week ?? 1,
      },
      counts: {
        currentWeekGames: gamesResult.count ?? 0,
        currentWeekAutoMarkets: marketsResult.count ?? 0,
      },
    });
  } catch (error) {
    console.error("Prediction automation GET failed:", error);
    return NextResponse.json(
      { error: "Unable to load prediction automation." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!(await requireCommissioner(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  try {
    const league = await getLeague();
    const body = await request.json();

    const templates = Array.isArray(body.templates)
      ? body.templates.filter(
          (value: unknown): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
      : ["game_winner"];

    const updated = await supabaseAdmin
      .from("prediction_automation_settings")
      .upsert(
        {
          league_id: league.id,
          enabled: Boolean(body.enabled),
          auto_grade: Boolean(body.autoGrade),
          close_minutes_before: Math.max(
            0,
            Number(body.closeMinutesBefore ?? 0),
          ),
          templates:
            templates.length > 0 ? templates : ["game_winner"],
          discord_post_enabled: Boolean(body.discordPostEnabled),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "league_id" },
      )
      .select("*")
      .single();

    if (updated.error) throw updated.error;

    return NextResponse.json({
      success: true,
      settings: updated.data,
    });
  } catch (error) {
    console.error("Prediction automation PUT failed:", error);
    return NextResponse.json(
      { error: "Unable to save prediction automation." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireCommissioner(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  try {
    const league = await getLeague();
    const body = await request.json().catch(() => ({}));

    const season = Number(body.season ?? league.season ?? 1);
    const week = Number(body.week ?? league.current_week ?? 1);

    const result = await generateMarketsForWeek(
      league.id,
      season,
      week,
    );

    return NextResponse.json({
      success: true,
      season,
      week,
      ...result,
    });
  } catch (error) {
    console.error("Prediction automation POST failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate prediction markets.",
      },
      { status: 500 },
    );
  }
}
