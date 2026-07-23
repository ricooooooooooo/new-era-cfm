import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

export async function POST() {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_ACTIVE_CHECK_CHANNEL_ID;

  if (!botToken || !channelId) {
    return NextResponse.json(
      {
        error:
          "DISCORD_BOT_TOKEN or DISCORD_ACTIVE_CHECK_CHANNEL_ID is missing.",
      },
      { status: 500 }
    );
  }

  try {
    const discordResponse = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "@everyone",
          allowed_mentions: {
            parse: ["everyone"],
          },
          embeds: [
            {
              title: "🏈 New Era CFM Active Check",
              description:
                "Click **I’m Active** below to confirm that you are active in the league.",
              color: 0x22c55e,
              fields: [
                {
                  name: "✅ Checked In — 0/32",
                  value: "No one has checked in yet.",
                },
                {
                  name: "❌ Did Not Check In — 32/32",
                  value: NFL_TEAMS.join("\n"),
                },
              ],
              footer: {
                text: "New Era CFM • Staff can view this list",
              },
              timestamp: new Date().toISOString(),
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 3,
                  label: "I'm Active",
                  custom_id: "active_check_join",
                  emoji: {
                    name: "✅",
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const responseData = await discordResponse.json();

    if (!discordResponse.ok) {
      console.error("Discord API error:", responseData);

      return NextResponse.json(
        {
          error: "Discord rejected the message.",
          details: responseData,
        },
        { status: discordResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: responseData.id,
      channelId: responseData.channel_id,
    });
  } catch (error) {
    console.error("Active check error:", error);

    return NextResponse.json(
      {
        error: "Failed to create the active check.",
      },
      { status: 500 }
    );
  }
}