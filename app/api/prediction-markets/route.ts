import { NextRequest, NextResponse } from "next/server";
import { isCommissioner } from "@/lib/auth/permissions";
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

export async function GET(request: NextRequest) {
  try {
    const week = Number(request.nextUrl.searchParams.get("week"));
    const season = Number(request.nextUrl.searchParams.get("season"));

    let query = supabaseAdmin
      .from("prediction_markets")
      .select(`
        *,
        prediction_options (*),
        league_games:game_id (
          id,
          season,
          week,
          scheduled_at,
          status,
          home_score,
          away_score,
          home_team_abbreviation,
          away_team_abbreviation,
          is_primetime,
          broadcast_label
        )
      `)
      .order("created_at", { ascending: false });

    if (Number.isInteger(season) && season > 0) {
      query = query.eq("season", season);
    }

    if (Number.isInteger(week) && week > 0) {
      query = query.eq("week", week);
    }

    const result = await query;

    if (result.error) throw result.error;

    return NextResponse.json(result.data ?? []);
  } catch (error) {
    console.error("Failed to load prediction markets:", error);

    return NextResponse.json(
      { error: "Failed to load prediction markets." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = readUser(request);

    if (!user?.id || !(await isCommissioner(user.id))) {
      return NextResponse.json(
        { error: "Only an owner or commissioner can create markets." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const closesAt = body.closesAt || null;

    const options = Array.isArray(body.options)
      ? body.options
          .map((option: unknown) => String(option ?? "").trim())
          .filter(Boolean)
      : [];

    if (!title) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 },
      );
    }

    if (options.length < 2) {
      return NextResponse.json(
        { error: "A market must have at least two options." },
        { status: 400 },
      );
    }

    const leagueResult = await supabaseAdmin
      .from("leagues")
      .select("id, season, current_week")
      .eq("slug", "gold-jacket-cfm")
      .maybeSingle();

    if (leagueResult.error) throw leagueResult.error;

    const marketResult = await supabaseAdmin
      .from("prediction_markets")
      .insert({
        league_id: leagueResult.data?.id ?? null,
        title,
        description,
        closes_at: closesAt,
        status: "open",
        market_type: "manual",
        category: "custom",
        auto_generated: false,
        auto_grade: false,
        source: "manual",
        season: leagueResult.data?.season ?? null,
        week: leagueResult.data?.current_week ?? null,
        metadata: {
          createdBy: user.id,
        },
      })
      .select()
      .single();

    if (marketResult.error) throw marketResult.error;

    const optionRows = options.map((label: string, index: number) => ({
      market_id: marketResult.data.id,
      label,
      option_key: `manual_${index + 1}`,
      odds_multiplier: 2,
    }));

    const optionResult = await supabaseAdmin
      .from("prediction_options")
      .insert(optionRows);

    if (optionResult.error) throw optionResult.error;

    return NextResponse.json({
      success: true,
      market: marketResult.data,
    });
  } catch (error) {
    console.error("Failed to create prediction market:", error);

    return NextResponse.json(
      { error: "Failed to create market." },
      { status: 500 },
    );
  }
}
