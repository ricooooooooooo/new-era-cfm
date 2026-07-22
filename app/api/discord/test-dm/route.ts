import { NextResponse } from "next/server";

const DISCORD_API_URL = "https://discord.com/api/v10";

type DiscordErrorResponse = {
  message?: string;
  code?: number;
};

type DiscordDmChannel = {
  id: string;
};

async function getDiscordError(response: Response) {
  try {
    const error = (await response.json()) as DiscordErrorResponse;

    return error.message ?? `Discord returned status ${response.status}.`;
  } catch {
    return `Discord returned status ${response.status}.`;
  }
}

export async function POST() {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const userId = process.env.DISCORD_TEST_USER_ID;

  if (!botToken || !userId) {
    return NextResponse.json(
      {
        success: false,
        message: "Discord environment variables are missing.",
      },
      { status: 500 },
    );
  }

  try {
    const createDmResponse = await fetch(
      `${DISCORD_API_URL}/users/@me/channels`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: userId,
        }),
        cache: "no-store",
      },
    );

    if (!createDmResponse.ok) {
      const errorMessage = await getDiscordError(createDmResponse);

      return NextResponse.json(
        {
          success: false,
          message: `Could not open the Discord DM: ${errorMessage}`,
        },
        { status: createDmResponse.status },
      );
    }

    const dmChannel =
      (await createDmResponse.json()) as DiscordDmChannel;

    const sendMessageResponse = await fetch(
      `${DISCORD_API_URL}/channels/${dmChannel.id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `<@${userId}>`,
          embeds: [
            {
              author: {
                name: "NEW ERA CFM",
              },
              title: "🏈 ACTIVITY WARNING",
              description:
                "Your activity has fallen below the league requirement.",
              color: 16753920,
              fields: [
                {
                  name: "📊 Activity",
                  value: "`71%`",
                  inline: true,
                },
                {
                  name: "🎮 User Games",
                  value: "`5 / 7`",
                  inline: true,
                },
                {
                  name: "🔥 Status",
                  value: "`WATCH LIST`",
                  inline: true,
                },
                {
                  name: "Next Step",
                  value:
                    "Complete your next scheduled user game before the next league advance.",
                  inline: false,
                },
              ],
              footer: {
                text: "New Era Connected Franchise • Automated Alert",
              },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
        cache: "no-store",
      },
    );

    if (!sendMessageResponse.ok) {
      const errorMessage = await getDiscordError(sendMessageResponse);

      return NextResponse.json(
        {
          success: false,
          message: `The DM opened, but the message failed: ${errorMessage}`,
        },
        { status: sendMessageResponse.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "New Era CFM activity warning sent successfully.",
    });
  } catch (error) {
    console.error("Discord DM failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The website could not connect to Discord.",
      },
      { status: 500 },
    );
  }
}