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
  city: string | null;
  name: string;
  abbreviation: string;
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
        city,
        name,
        abbreviation,
        members:owner_member_id (
          discord_id
        )
      `,
    );

  if (error) {
    console.error("Unable to load team owners for trade mentions:", error);
    return [];
  }

  const teams = (data || []) as TeamOwnerRow[];

  const matchedTeams = [
    teams.find((team) =>
      teamMatches(
        teamOne,
        [team.city, team.name].filter(Boolean).join(" "),
        team.abbreviation,
      ),
    ),
    teams.find((team) =>
      teamMatches(
        teamTwo,
        [team.city, team.name].filter(Boolean).join(" "),
        team.abbreviation,
      ),
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

function extractPickValue(text: string): number {
  const normalized = text.toLowerCase();
  let value = 0;

  const pickPatterns = [
    { pattern: /1st round pick|first round pick|\b1st\b/g, value: 42 },
    { pattern: /2nd round pick|second round pick|\b2nd\b/g, value: 24 },
    { pattern: /3rd round pick|third round pick|\b3rd\b/g, value: 13 },
    { pattern: /4th round pick|fourth round pick|\b4th\b/g, value: 7 },
    { pattern: /5th round pick|fifth round pick|\b5th\b/g, value: 4 },
    { pattern: /6th round pick|sixth round pick|\b6th\b/g, value: 2 },
    { pattern: /7th round pick|seventh round pick|\b7th\b/g, value: 1 },
  ];

  for (const item of pickPatterns) {
    const matches = normalized.match(item.pattern);
    value += (matches?.length || 0) * item.value;
  }

  return value;
}

function extractPlayerValue(text: string): number {
  const normalized = text.toLowerCase();
  let value = 0;

  const elitePlayers: Record<string, number> = {
    "patrick mahomes": 100,
    "josh allen": 95,
    "lamar jackson": 95,
    "joe burrow": 92,
    "justin herbert": 90,
    "jalen hurts": 88,
    "cj stroud": 88,
    "caleb williams": 84,
    "jayden daniels": 88,
    "drake maye": 82,
    "trevor lawrence": 78,
    "dak prescott": 76,
    "brock purdy": 78,
    "justin jefferson": 88,
    "jamarr chase": 88,
    "ceedee lamb": 86,
    "amon-ra st. brown": 82,
    "aj brown": 80,
    "puka nacua": 80,
    "garrett wilson": 76,
    "malik nabers": 80,
    "marvin harrison jr": 80,
    "tyreek hill": 72,
    "micah parsons": 88,
    "myles garrett": 84,
    "maxx crosby": 80,
    "tj watt": 80,
    "nick bosa": 82,
    "aidan hutchinson": 82,
    "sauce gardner": 80,
    "patrick surtain": 82,
    "trent williams": 68,
    "penei sewell": 82,
    "christian darrisaw": 76,
    "bijan robinson": 74,
    "jahmyr gibbs": 74,
    "breece hall": 68,
    "vita vea": 56,
  };

  const found = new Set<string>();

  for (const [name, playerValue] of Object.entries(elitePlayers)) {
    if (normalized.includes(name) && !found.has(name)) {
      value += playerValue;
      found.add(name);
    }
  }

  const segments = normalized
    .split(/,|\n|&|\+|\band\b/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const segment of segments) {
    if (
      /round pick|\b1st\b|\b2nd\b|\b3rd\b|\b4th\b|\b5th\b|\b6th\b|\b7th\b/.test(
        segment,
      )
    ) {
      continue;
    }

    const alreadyMatched = Array.from(found).some((name) =>
      segment.includes(name),
    );

    if (!alreadyMatched && /[a-z]/.test(segment)) {
      value += 34;
    }
  }

  return value;
}

function calculateAssetValue(text: string): number {
  return extractPickValue(text) + extractPlayerValue(text);
}

function gradeFromDifference(
  receivedValue: number,
  sentValue: number,
): string {
  if (sentValue <= 0) return "B";

  const ratio = receivedValue / sentValue;

  if (ratio >= 1.95) return "A+";
  if (ratio >= 1.55) return "A";
  if (ratio >= 1.3) return "A-";
  if (ratio >= 1.14) return "B+";
  if (ratio >= 0.92) return "B";
  if (ratio >= 0.78) return "B-";
  if (ratio >= 0.64) return "C+";
  if (ratio >= 0.52) return "C";
  if (ratio >= 0.42) return "C-";
  if (ratio >= 0.32) return "D";
  return "F";
}

function describePackage(text: string): string {
  const firsts = (text.match(/1st round pick|first round pick|\b1st\b/gi) || [])
    .length;
  const seconds = (
    text.match(/2nd round pick|second round pick|\b2nd\b/gi) || []
  ).length;
  const later = (
    text.match(
      /3rd round pick|4th round pick|5th round pick|6th round pick|7th round pick|\b3rd\b|\b4th\b|\b5th\b|\b6th\b|\b7th\b/gi,
    ) || []
  ).length;

  if (firsts >= 2) {
    return "multiple first-round picks and meaningful long-term flexibility";
  }

  if (firsts === 1 && seconds >= 1) {
    return "a strong package built around a first-round pick and additional draft capital";
  }

  if (firsts === 1) {
    return "a valuable first-round pick";
  }

  if (seconds >= 2) {
    return "multiple second-round picks";
  }

  if (seconds === 1 && later > 0) {
    return "useful mid-round draft capital";
  }

  return "the submitted return";
}

function buildLocalReason({
  team,
  received,
  receivedValue,
  sentValue,
}: {
  team: string;
  received: string;
  receivedValue: number;
  sentValue: number;
}): string {
  const ratio = sentValue > 0 ? receivedValue / sentValue : 1;
  const packageDescription = describePackage(received);

  if (ratio >= 1.55) {
    return `${team} lands ${packageDescription} at a major value advantage.`;
  }

  if (ratio >= 1.2) {
    return `${team} comes out ahead by securing ${packageDescription} without giving up equal value.`;
  }

  if (ratio >= 0.9) {
    return `${team} receives fair value in a deal that makes sense for both sides.`;
  }

  if (ratio >= 0.68) {
    return `${team} gets a useful return, but the price is slightly heavier than the value coming back.`;
  }

  return `${team} gives up the stronger package and takes on significant value risk.`;
}

function generateTradeGrade({
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
  const teamOneReceivedValue = calculateAssetValue(teamTwoSends);
  const teamOneSentValue = calculateAssetValue(teamOneSends);
  const teamTwoReceivedValue = teamOneSentValue;
  const teamTwoSentValue = teamOneReceivedValue;

  const teamOneGrade = gradeFromDifference(
    teamOneReceivedValue,
    teamOneSentValue,
  );
  const teamTwoGrade = gradeFromDifference(
    teamTwoReceivedValue,
    teamTwoSentValue,
  );

  const difference = teamOneReceivedValue - teamOneSentValue;
  const absoluteDifference = Math.abs(difference);
  const baseline = Math.max(teamOneReceivedValue, teamOneSentValue, 1);
  const differenceRatio = absoluteDifference / baseline;

  let winner = "Even";

  if (differenceRatio >= 0.12) {
    winner = difference > 0 ? teamOne : teamTwo;
  }

  let confidence: TradeGrade["confidence"] = "medium";

  const recognizableValue =
    extractPlayerValue(teamOneSends) + extractPlayerValue(teamTwoSends);

  if (recognizableValue >= 100 || extractPickValue(teamOneSends + teamTwoSends) >= 60) {
    confidence = "high";
  } else if (recognizableValue < 50) {
    confidence = "low";
  }

  const verdict =
    winner === "Even"
      ? "The value is close enough to call this a balanced trade."
      : `${winner} receives the stronger overall value package.`;

  return Promise.resolve({
    teamOneGrade,
    teamTwoGrade,
    winner,
    verdict,
    teamOneReason: buildLocalReason({
      team: teamOne,
      received: teamTwoSends,
      receivedValue: teamOneReceivedValue,
      sentValue: teamOneSentValue,
    }),
    teamTwoReason: buildLocalReason({
      team: teamTwo,
      received: teamOneSends,
      receivedValue: teamTwoReceivedValue,
      sentValue: teamTwoSentValue,
    }),
    confidence,
  });
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