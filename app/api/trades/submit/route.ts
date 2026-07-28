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

type TeamOwnerRow = {
  team_name: string | null;
  team_abbr: string | null;
  members:
    | {
        discord_id: string | null;
      }
    | {
        discord_id: string | null;
      }[]
    | null;
};

type TradeGrade = {
  teamOneGrade: string;
  teamTwoGrade: string;
  winner: string;
  verdict: string;
  teamOneReason: string;
  teamTwoReason: string;
  confidence: "low" | "medium" | "high";
};

const VALID_GRADES = new Set([
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
]);

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTeam(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function getBaseUrl(request: NextRequest): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return request.nextUrl.origin;
}

function getOwnerDiscordId(team: TeamOwnerRow): string | null {
  if (!team.members) {
    return null;
  }

  const member = Array.isArray(team.members)
    ? team.members[0] ?? null
    : team.members;

  return member?.discord_id?.trim() || null;
}

function teamMatches(
  submittedTeam: string,
  databaseTeamName: string | null,
  databaseTeamAbbr: string | null,
): boolean {
  const submitted = normalizeTeam(submittedTeam);
  const fullName = normalizeTeam(databaseTeamName || "");
  const abbreviation = normalizeTeam(databaseTeamAbbr || "");

  if (!submitted) {
    return false;
  }

  if (submitted === fullName || submitted === abbreviation) {
    return true;
  }

  const submittedWords = submitted.split(" ");
  const databaseWords = fullName.split(" ");
  const submittedNickname = submittedWords.at(-1);
  const databaseNickname = databaseWords.at(-1);

  return Boolean(
    submittedNickname &&
      databaseNickname &&
      submittedNickname === databaseNickname,
  );
}

async function findTradeOwnerIds(
  teamOne: string,
  teamTwo: string,
): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("teams")
    .select(
      `
        team_name,
        team_abbr,
        members:owner_member_id (
          discord_id
        )
      `,
    )
    .eq("is_active", true);

  if (error) {
    console.error("Unable to load team owners for trade mentions:", error);
    return [];
  }

  const teams = (data || []) as TeamOwnerRow[];

  const matchedTeams = [
    teams.find((team) =>
      teamMatches(teamOne, team.team_name, team.team_abbr),
    ),
    teams.find((team) =>
      teamMatches(teamTwo, team.team_name, team.team_abbr),
    ),
  ];

  return Array.from(
    new Set(
      matchedTeams
        .map((team) => (team ? getOwnerDiscordId(team) : null))
        .filter((discordId): discordId is string => Boolean(discordId)),
    ),
  );
}

function fallbackGrade(
  teamOne: string,
  teamTwo: string,
): TradeGrade {
  return {
    teamOneGrade: "B",
    teamTwoGrade: "B",
    winner: "Even",
    verdict: "A balanced deal based on the submitted assets.",
    teamOneReason: `${teamOne} filled a need without receiving an obviously unfair return.`,
    teamTwoReason: `${teamTwo} received comparable value based on the information submitted.`,
    confidence: "low",
  };
}

function sanitizeGrade(
  value: unknown,
  fallback: string,
): string {
  const grade = cleanText(value).toUpperCase();
  return VALID_GRADES.has(grade) ? grade : fallback;
}

function sanitizeAnalysis(
  value: unknown,
  teamOne: string,
  teamTwo: string,
): TradeGrade {
  const fallback = fallbackGrade(teamOne, teamTwo);

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const raw = value as Record<string, unknown>;
  const winner = cleanText(raw.winner);

  return {
    teamOneGrade: sanitizeGrade(raw.teamOneGrade, fallback.teamOneGrade),
    teamTwoGrade: sanitizeGrade(raw.teamTwoGrade, fallback.teamTwoGrade),
    winner:
      winner === teamOne || winner === teamTwo || winner === "Even"
        ? winner
        : "Even",
    verdict: cleanText(raw.verdict).slice(0, 220) || fallback.verdict,
    teamOneReason:
      cleanText(raw.teamOneReason).slice(0, 260) ||
      fallback.teamOneReason,
    teamTwoReason:
      cleanText(raw.teamTwoReason).slice(0, 260) ||
      fallback.teamTwoReason,
    confidence:
      raw.confidence === "high" ||
      raw.confidence === "medium" ||
      raw.confidence === "low"
        ? raw.confidence
        : "low",
  };
}

async function generateTradeGrade({
  teamOne,
  teamOneSends,
  teamTwo,
  teamTwoSends,
}: {
  teamOne: string;
  teamOneSends: string;
  teamTwo: string;
  teamTwoSends: string;
}): Promise<TradeGrade> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("OPENAI_API_KEY is missing. Using fallback trade grades.");
    return fallbackGrade(teamOne, teamTwo);
  }

  const model =
    process.env.OPENAI_TRADE_GRADING_MODEL || "gpt-4.1-mini";

  const schema = {
    type: "object",
    additionalProperties: false,
    required: [
      "teamOneGrade",
      "teamTwoGrade",
      "winner",
      "verdict",
      "teamOneReason",
      "teamTwoReason",
      "confidence",
    ],
    properties: {
      teamOneGrade: {
        type: "string",
        enum: [
          "A+",
          "A",
          "A-",
          "B+",
          "B",
          "B-",
          "C+",
          "C",
          "C-",
          "D+",
          "D",
          "D-",
          "F",
        ],
      },
      teamTwoGrade: {
        type: "string",
        enum: [
          "A+",
          "A",
          "A-",
          "B+",
          "B",
          "B-",
          "C+",
          "C",
          "C-",
          "D+",
          "D",
          "D-",
          "F",
        ],
      },
      winner: {
        type: "string",
        enum: [teamOne, teamTwo, "Even"],
      },
      verdict: {
        type: "string",
      },
      teamOneReason: {
        type: "string",
      },
      teamTwoReason: {
        type: "string",
      },
      confidence: {
        type: "string",
        enum: ["low", "medium", "high"],
      },
    },
  };

  const instructions = `You are the NEW ERA CFM trade analyst for a competitive Madden franchise league.

Grade the submitted trade realistically and conservatively.

Rules:
- Evaluate positional value, player quality implied by recognizable NFL names, age/career stage when confidently known, scarcity, number of assets, and normal dynasty draft-pick value.
- Quarterbacks are highly valuable, especially young starters.
- Premium positions such as QB, WR, edge rusher, CB, and offensive tackle generally carry more value.
- Do not invent Madden overalls, development traits, contracts, abilities, injuries, or league standings.
- Do not pretend to know custom roster changes that are not supplied.
- When information is limited or a player is unfamiliar, lower confidence and keep the grades closer together.
- Avoid rage-bait. A fair trade should usually produce grades from B- through B+.
- Reserve A+/F gaps for clearly extreme value differences.
- Reasons must be direct and no longer than two sentences each.
- The verdict must be one short sentence.
- winner must be exactly one team name provided or "Even".`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions,
        input: `TRADE:

${teamOne} sends:
${teamOneSends}

${teamTwo} sends:
${teamTwoSends}

Remember:
${teamOne} receives ${teamTwoSends}.
${teamTwo} receives ${teamOneSends}.`,
        text: {
          format: {
            type: "json_schema",
            name: "new_era_trade_grade",
            strict: true,
            schema,
          },
        },
      }),
      cache: "no-store",
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        `OpenAI trade grading returned ${response.status}: ${responseText}`,
      );
      return fallbackGrade(teamOne, teamTwo);
    }

    const payload = JSON.parse(responseText) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{
          type?: string;
          text?: string;
        }>;
      }>;
    };

    const outputText =
      payload.output_text ||
      payload.output
        ?.flatMap((item) => item.content || [])
        .find((item) => item.type === "output_text")?.text;

    if (!outputText) {
      console.error("OpenAI returned no trade grade output.");
      return fallbackGrade(teamOne, teamTwo);
    }

    return sanitizeAnalysis(
      JSON.parse(outputText) as unknown,
      teamOne,
      teamTwo,
    );
  } catch (error) {
    console.error("Trade grading failed:", error);
    return fallbackGrade(teamOne, teamTwo);
  }
}

function buildTradeCaption({
  teamOne,
  teamOneSends,
  teamTwo,
  teamTwoSends,
  ownerDiscordIds,
  analysis,
}: {
  teamOne: string;
  teamOneSends: string;
  teamTwo: string;
  teamTwoSends: string;
  ownerDiscordIds: string[];
  analysis: TradeGrade;
}) {
  const ownerMentions =
    ownerDiscordIds.length > 0
      ? `\n${ownerDiscordIds.map((id) => `<@${id}>`).join(" ")}\n`
      : "\n";

  const winnerLine =
    analysis.winner === "Even"
      ? "**Analyst verdict:** Even trade"
      : `**Analyst winner:** ${analysis.winner}`;

  return `@everyone

# BREAKING: OFFICIAL NEW ERA TRADE
${ownerMentions}
The **${teamOne}** and **${teamTwo}** have agreed to a trade.

**${teamOne} receive**
${teamTwoSends}

**${teamTwo} receive**
${teamOneSends}

## NEW ERA TRADE GRADES

**${teamOne}: ${analysis.teamOneGrade}**
${analysis.teamOneReason}

**${teamTwo}: ${analysis.teamTwoGrade}**
${analysis.teamTwoReason}

${winnerLine}

*${analysis.verdict}*

The deal has been approved by the NEW ERA trade committee and is now official.`;
}

async function downloadTradeGraphic(imageUrl: string): Promise<Blob> {
  const imageResponse = await fetch(imageUrl, {
    cache: "no-store",
  });

  if (!imageResponse.ok) {
    const responseText = await imageResponse.text();

    throw new Error(
      `Trade graphic returned ${imageResponse.status}: ${
        responseText || "Unknown image error"
      }`,
    );
  }

  return imageResponse.blob();
}

async function sendDiscordTradeAlert({
  botToken,
  channelId,
  caption,
  imageUrl,
  tradeId,
  ownerDiscordIds,
}: {
  botToken: string;
  channelId: string;
  caption: string;
  imageUrl: string;
  tradeId: string;
  ownerDiscordIds: string[];
}): Promise<DiscordMessageResponse> {
  const imageBlob = await downloadTradeGraphic(imageUrl);
  const filename = `new-era-trade-${tradeId}.png`;

  const payload = {
    content: caption.slice(0, 2000),
    allowed_mentions: {
      parse: ["everyone"],
      users: ownerDiscordIds,
      replied_user: false,
    },
    attachments: [
      {
        id: 0,
        filename,
        description: "Official NEW ERA CFM trade graphic",
      },
    ],
  };

  const formData = new FormData();
  formData.append("payload_json", JSON.stringify(payload));
  formData.append("files[0]", imageBlob, filename);

  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      body: formData,
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

    const [ownerDiscordIds, analysis] = await Promise.all([
      findTradeOwnerIds(teamOne, teamTwo),
      generateTradeGrade({
        teamOne,
        teamOneSends,
        teamTwo,
        teamTwoSends,
      }),
    ]);

    const reportText = buildTradeCaption({
      teamOne,
      teamOneSends,
      teamTwo,
      teamTwoSends,
      ownerDiscordIds,
      analysis,
    });

    const analysisGeneratedAt = new Date().toISOString();

    const { data: trade, error: insertError } = await supabaseAdmin
      .from("trades")
      .insert({
        team_one: teamOne,
        team_one_sends: teamOneSends,
        team_two: teamTwo,
        team_two_sends: teamTwoSends,
        status: "pending",
        report_text: reportText,
        trade_analysis: analysis,
        analysis_generated_at: analysisGeneratedAt,
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

    const imageUrl = `${getBaseUrl(request)}/api/trades/${trade.id}/image`;

    try {
      const discordMessage = await sendDiscordTradeAlert({
        botToken,
        channelId: tradeAlertChannelId,
        caption: reportText,
        imageUrl,
        tradeId: trade.id,
        ownerDiscordIds,
      });

      const approvedAt = new Date().toISOString();

      const { data: publishedTrade, error: updateError } = await supabaseAdmin
        .from("trades")
        .update({
          status: "approved",
          approved_at: approvedAt,
          graphic_url: imageUrl,
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
            imageUrl,
            discordMessageId: discordMessage.id,
            mentionedOwnerIds: ownerDiscordIds,
          },
          { status: 207 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          trade: publishedTrade,
          imageUrl,
          mentionedOwnerIds: ownerDiscordIds,
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