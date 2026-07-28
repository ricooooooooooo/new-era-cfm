import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type TradeSubmissionBody = {
  secret?: unknown;
  timestamp?: unknown;
  yourTeam?: unknown;
  tradingAway?: unknown;
  otherTeam?: unknown;
  receiving?: unknown;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TradeSubmissionBody;

    const expectedSecret = process.env.GOOGLE_TRADE_FORM_SECRET;
    const suppliedSecret = cleanText(body.secret);

    if (!expectedSecret) {
      console.error("GOOGLE_TRADE_FORM_SECRET is missing.");

      return NextResponse.json(
        {
          error: "Trade submission service is not configured.",
        },
        {
          status: 500,
        },
      );
    }

    if (!suppliedSecret || suppliedSecret !== expectedSecret) {
      return NextResponse.json(
        {
          error: "Unauthorized trade submission.",
        },
        {
          status: 401,
        },
      );
    }

    const teamOne = cleanText(body.yourTeam);
    const teamOneSends = cleanText(body.tradingAway);
    const teamTwo = cleanText(body.otherTeam);
    const teamTwoSends = cleanText(body.receiving);
    const googleFormTimestamp = cleanText(body.timestamp);

    if (!teamOne || !teamOneSends || !teamTwo || !teamTwoSends) {
      return NextResponse.json(
        {
          error:
            "Your Team, Trading Away, Team You’re Trading With, and Trade Assets You Are Receiving are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (teamOne.toLowerCase() === teamTwo.toLowerCase()) {
      return NextResponse.json(
        {
          error: "A team cannot submit a trade with itself.",
        },
        {
          status: 400,
        },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("trades")
      .insert({
        team_one: teamOne,
        team_one_sends: teamOneSends,
        team_two: teamTwo,
        team_two_sends: teamTwoSends,
        status: "pending",
        source: "google_form",
        google_form_timestamp: googleFormTimestamp || null,
      })
      .select(
        "id, submitted_at, team_one, team_one_sends, team_two, team_two_sends, status",
      )
      .single();

    if (error) {
      console.error("Unable to save Google Form trade:", error);

      return NextResponse.json(
        {
          error: "The trade could not be saved.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        trade: data,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Trade submission request failed:", error);

    return NextResponse.json(
      {
        error: "Invalid trade submission request.",
      },
      {
        status: 400,
      },
    );
  }
}
