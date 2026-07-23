import { NextRequest, NextResponse } from "next/server";
import nacl from "tweetnacl";

export const runtime = "nodejs";

const DISCORD_PING = 1;
const DISCORD_MESSAGE_COMPONENT = 3;

const RESPONSE_PONG = 1;
const RESPONSE_CHANNEL_MESSAGE = 4;
const RESPONSE_UPDATE_MESSAGE = 7;

const NFL_TEAMS = [
  "Cardinals",
  "Falcons",
  "Ravens",
  "Bills",
  "Panthers",
  "Bears",
  "Bengals",
  "Browns",
  "Cowboys",
  "Broncos",
  "Lions",
  "Packers",
  "Texans",
  "Colts",
  "Jaguars",
  "Chiefs",
  "Raiders",
  "Chargers",
  "Rams",
  "Dolphins",
  "Vikings",
  "Patriots",
  "Saints",
  "Giants",
  "Jets",
  "Eagles",
  "Steelers",
  "49ers",
  "Seahawks",
  "Buccaneers",
  "Titans",
  "Commanders",
];

function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null
) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!publicKey || !signature || !timestamp) {
    return false;
  }

  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(publicKey, "hex")
    );
  } catch (error) {
    console.error("Discord signature verification failed:", error);
    return false;
  }
}

function extractTeamFromNickname(nickname: string) {
  const cleanedNickname = nickname
    .replace(/^\{co\}\s*/i, "")
    .trim();

  const teamSection = cleanedNickname.split("||")[0]?.trim() || "";

  return (
    NFL_TEAMS.find(
      (team) => team.toLowerCase() === teamSection.toLowerCase()
    ) || null
  );
}

function parseCheckedInNames(value: string | undefined) {
  if (!value || value === "No one has checked in yet.") {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.replace(/^✅\s*/, "").trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const rawBody = await request.text();

  const validRequest = verifyDiscordRequest(
    rawBody,
    signature,
    timestamp
  );

  if (!validRequest) {
    return new NextResponse("Invalid request signature", {
      status: 401,
    });
  }

  let interaction;

  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  if (interaction.type === DISCORD_PING) {
    return NextResponse.json({
      type: RESPONSE_PONG,
    });
  }

  if (
    interaction.type === DISCORD_MESSAGE_COMPONENT &&
    interaction.data?.custom_id === "active_check_join"
  ) {
    const discordUser =
      interaction.member?.user ?? interaction.user;

    const displayName =
      interaction.member?.nick ||
      interaction.member?.user?.global_name ||
      discordUser?.global_name ||
      discordUser?.username ||
      "Unknown User";

    const team = extractTeamFromNickname(displayName);

    if (!team) {
      return NextResponse.json({
        type: RESPONSE_CHANNEL_MESSAGE,
        data: {
          content:
            "❌ I could not determine your team from your server nickname. Your nickname should look like `Steelers || Buss` or `{Co} Steelers || Buss`.",
          flags: 64,
        },
      });
    }

    const currentEmbed = interaction.message?.embeds?.[0];

    const checkedInField = currentEmbed?.fields?.find(
      (field: { name?: string }) =>
        field.name?.includes("Checked In")
    );

    const checkedInNames = parseCheckedInNames(
      checkedInField?.value
    );

    const alreadyCheckedIn = checkedInNames.some(
      (name) => name.toLowerCase() === displayName.toLowerCase()
    );

    if (alreadyCheckedIn) {
      return NextResponse.json({
        type: RESPONSE_CHANNEL_MESSAGE,
        data: {
          content: `✅ **${displayName}**, you already checked in.`,
          flags: 64,
        },
      });
    }

    const updatedCheckedInNames = [
      ...checkedInNames,
      displayName,
    ];

    const checkedInTeams = new Set(
      updatedCheckedInNames
        .map(extractTeamFromNickname)
        .filter((value): value is string => Boolean(value))
    );

    const remainingTeams = NFL_TEAMS.filter(
      (nflTeam) => !checkedInTeams.has(nflTeam)
    );

    const checkedInValue = updatedCheckedInNames
      .map((name) => `✅ ${name}`)
      .join("\n");

    const remainingValue =
      remainingTeams.length > 0
        ? remainingTeams.join("\n")
        : "🎉 Every team has checked in!";

    return NextResponse.json({
      type: RESPONSE_UPDATE_MESSAGE,
      data: {
        content: interaction.message?.content || "@everyone",
        allowed_mentions: {
          parse: [],
        },
        embeds: [
          {
            title: "🏈 New Era CFM Active Check",
            description:
              "Click **I’m Active** below to confirm that you are active in the league.",
            color: 0x22c55e,
            fields: [
              {
                name: `✅ Checked In — ${checkedInTeams.size}/32`,
                value: checkedInValue,
              },
              {
                name: `❌ Did Not Check In — ${remainingTeams.length}/32`,
                value: remainingValue,
              },
            ],
            footer: {
              text: "New Era CFM • Staff can view this list",
            },
            timestamp:
              currentEmbed?.timestamp || new Date().toISOString(),
          },
        ],
        components: interaction.message?.components || [],
      },
    });
  }

  return NextResponse.json({
    type: RESPONSE_CHANNEL_MESSAGE,
    data: {
      content: "That button is not currently supported.",
      flags: 64,
    },
  });
}