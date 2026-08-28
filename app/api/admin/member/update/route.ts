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

type DiscordMessageResponse = {
  id: string;
  channel_id: string;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildTradeReport({
  teamOne,
  teamOneSends,
  teamTwo,
  teamTwoSends,
}: {
  teamOne: string;
  teamOneSends: string;
  teamTwo: string;
  teamTwoSends: string;
}) {
  return `BREAKING: The ${teamOne} and ${teamTwo} have agreed to a trade.

${teamOne} receive:
${teamTwoSends}

${teamTwo} receive:
${teamOneSends}

The deal has been approved by the GOLD JACKET trade committee and is now official.`;
}

async function sendDiscordTradeAlert({
  botToken,
  channelId,
  reportText,
}: {
  botToken: string;
  channelId: string;
  reportText: string;
}): Promise<DiscordMessageResponse> {
  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: reportText,
        allowed_mentions: {
          parse: [],
        },
      }),
      cache: "no-store",
    },
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Discord returned ${response.status}: ${responseText || "Unknown error"}`,
    );
  }

  return JSON.parse(responseText) as DiscordMessageResponse;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TradeSubmissionBody;

    const expectedSecret = process.env.GOOGLE_TRADE_FORM_SECRET;
    const suppliedSecret = cleanText(body.secret);
    const botToken = process.env.ADAM_SCHEFTER_BOT_TOKEN;
    const tradeAlertChannelId = process.env.TRADE_ALERT_CHANNEL_ID;

    if (!expectedSecret) {
      console.error("GOOGLE_TRADE_FORM_SECRET is missing.");

      return NextResponse.json(
        { error: "Trade submission service is not configured." },
        { status: 500 },
      );
    }

    if (!botToken || !tradeAlertChannelId) {
      console.error(
        "ADAM_SCHEFTER_BOT_TOKEN or TRADE_ALERT_CHANNEL_ID is missing.",
      );

      return NextResponse.json(
        { error: "Discord trade alerts are not configured." },
        { status: 500 },
      );
    }

    if (!suppliedSecret || suppliedSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized trade submission." },
        { status: 401 },
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
        { status: 400 },
      );
    }

    if (teamOne.toLowerCase() === teamTwo.toLowerCase()) {
      return NextResponse.json(
        { error: "A team cannot submit a trade with itself." },
        { status: 400 },
      );
    }

    const reportText = buildTradeReport({
      teamOne,
      teamOneSends,
      teamTwo,
      teamTwoSends,
    });

    const { data: trade, error: insertError } = await supabaseAdmin
      .from("trades")
      .insert({
        team_one: teamOne,
        team_one_sends: teamOneSends,
        team_two: teamTwo,
        team_two_sends: teamTwoSends,
        status: "pending",
        report_text: reportText,
        source: "google_form",
        google_form_timestamp: googleFormTimestamp || null,
      })
      .select("*")
      .single();

    if (insertError || !trade) {
      console.error("Unable to save trade:", insertError);

      return NextResponse.json(
        {
          error: "The trade could not be saved.",
          details: insertError?.message,
        },
        { status: 500 },
      );
    }

    try {
      const discordMessage = await sendDiscordTradeAlert({
        botToken,
        channelId: tradeAlertChannelId,
        reportText,
      });

      const approvedAt = new Date().toISOString();

      const { data: publishedTrade, error: updateError } = await supabaseAdmin
        .from("trades")
        .update({
          status: "approved",
          approved_at: approvedAt,
          discord_message_id: discordMessage.id,
          discord_channel_id: discordMessage.channel_id,
          updated_at: approvedAt,
        })
        .eq("id", trade.id)
        .select("*")
        .single();

      if (updateError || !publishedTrade) {
        console.error(
          "Discord post succeeded, but the trade record could not be updated:",
          updateError,
        );

        return NextResponse.json(
          {
            success: true,
            warning:
              "The trade posted to Discord, but its database status could not be updated.",
            trade,
            discordMessageId: discordMessage.id,
          },
          { status: 207 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          trade: publishedTrade,
        },
        { status: 201 },
      );
    } catch (discordError) {
      console.error("Unable to post trade to Discord:", discordError);

      return NextResponse.json(
        {
          error:
            "The trade was saved as pending, but the Discord alert could not be posted.",
          tradeId: trade.id,
          details:
            discordError instanceof Error
              ? discordError.message
              : "Unknown Discord error",
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Trade submission failed:", error);

    return NextResponse.json(
      { error: "Invalid trade submission request." },
      { status: 400 },
    );
  }
}