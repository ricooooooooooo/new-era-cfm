import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isCommissioner } from "@/lib/auth/permissions";

type SavedDiscordUser = {
  id: string;
};

type MarketStatus = "open" | "closed" | "graded";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("prediction_markets")
      .select(`
        *,
        prediction_options(*)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Failed to load prediction markets:", error);

    return NextResponse.json(
      {
        error: "Failed to load prediction markets.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const encodedUser = request.cookies.get("new_era_discord_user")?.value;

    if (!encodedUser) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const decodedUser = Buffer.from(encodedUser, "base64url").toString("utf8");
    const user = JSON.parse(decodedUser) as SavedDiscordUser;

    const allowed = await isCommissioner(user.id);

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();

    const closesAt = body.closesAt;

    const options = Array.isArray(body.options)
      ? body.options
          .map((option: string) => option.trim())
          .filter(Boolean)
      : [];

    if (!title) {
      return NextResponse.json(
        {
          error: "Title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (options.length < 2) {
      return NextResponse.json(
        {
          error: "A market must have at least two options.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: market, error: marketError } = await supabaseAdmin
      .from("prediction_markets")
      .insert({
        title,
        description,
        closes_at: closesAt || null,
        status: "open" satisfies MarketStatus,
      })
      .select()
      .single();

    if (marketError) throw marketError;

    const optionRows = options.map((label: string) => ({
      market_id: market.id,
      label,
    }));

    const { error: optionError } = await supabaseAdmin
      .from("prediction_options")
      .insert(optionRows);

    if (optionError) throw optionError;

    return NextResponse.json({
      success: true,
      market,
    });
  } catch (error) {
    console.error("Failed to create market:", error);

    return NextResponse.json(
      {
        error: "Failed to create market.",
      },
      {
        status: 500,
      }
    );
  }
}