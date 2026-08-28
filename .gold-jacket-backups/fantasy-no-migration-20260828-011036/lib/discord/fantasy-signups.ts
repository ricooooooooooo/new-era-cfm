type FantasySignupNotificationInput = {
  baseUrl: string;
  spotNumber: number;
  totalFilled: number;
  discordUsername: string;
  sleeperUsername: string;
  teamName: string | null;
};

const GOLD = 0xd4af37;

export async function sendFantasySignupNotification({
  baseUrl,
  spotNumber,
  totalFilled,
  discordUsername,
  sleeperUsername,
  teamName,
}: FantasySignupNotificationInput): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_FANTASY_SIGNUPS_CHANNEL_ID;

  if (!botToken || !channelId) {
    console.warn(
      "DISCORD_BOT_TOKEN or DISCORD_FANTASY_SIGNUPS_CHANNEL_ID is missing. Fantasy signup was saved, but no Discord post was sent.",
    );
    return false;
  }

  const imageParams = new URLSearchParams({
    spot: String(spotNumber),
    discord: discordUsername,
    sleeper: sleeperUsername,
  });

  if (teamName) imageParams.set("team", teamName);

  const imageUrl = `${baseUrl.replace(/\/$/, "")}/api/fantasy-signups/card?${imageParams.toString()}`;

  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: `🏆 FANTASY SPOT #${spotNumber} LOCKED`,
            description: `**@${discordUsername}** is officially in Gold Jacket Fantasy.`,
            color: GOLD,
            fields: [
              {
                name: "Discord",
                value: `@${discordUsername}`,
                inline: true,
              },
              {
                name: "Sleeper",
                value: `@${sleeperUsername}`,
                inline: true,
              },
              {
                name: "Team Name",
                value: teamName || "Not set yet",
                inline: true,
              },
              {
                name: "League",
                value: "10-Team PPR • Sleeper • $10 Buy-In",
                inline: false,
              },
            ],
            image: { url: imageUrl },
            footer: {
              text: `GOLD JACKET FANTASY • ${totalFilled} / 10 SPOTS FILLED`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Discord fantasy signup post failed (${response.status}): ${body}`,
    );
  }

  return true;
}
