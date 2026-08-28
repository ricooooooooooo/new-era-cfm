type FantasySignupNotificationInput = {
  baseUrl: string;
  spotNumber: number;
  totalFilled: number;
  discordUsername: string;
  sleeperUsername: string;
  teamName: string | null;
};

type DiscordChannel = {
  id?: string;
  name?: string;
  type?: number;
};

const GOLD = 0xd4af37;
const TARGET_CHANNEL = "fantasy-signups";

function normalizeChannelName(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveFantasySignupChannel(
  botToken: string,
): Promise<string | null> {
  const configured =
    process.env.DISCORD_FANTASY_SIGNUPS_CHANNEL_ID?.trim();

  if (configured) {
    return configured;
  }

  const guildId = process.env.DISCORD_GUILD_ID?.trim();

  if (!guildId) {
    console.warn(
      "DISCORD_GUILD_ID is missing. Fantasy signup will save, but Discord auto-post cannot find the channel.",
    );
    return null;
  }

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/channels`,
    {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.warn(
      `Discord channel lookup failed (${response.status}). Fantasy signup was still saved.`,
    );
    return null;
  }

  const channels = (await response.json()) as DiscordChannel[];

  const exact = channels.find((channel) => {
    const typeOkay = channel.type === 0 || channel.type === 5;
    return (
      typeOkay &&
      typeof channel.name === "string" &&
      normalizeChannelName(channel.name) === TARGET_CHANNEL
    );
  });

  if (exact?.id) {
    return exact.id;
  }

  const fallback = channels.find((channel) => {
    if (
      (channel.type !== 0 && channel.type !== 5) ||
      typeof channel.name !== "string"
    ) {
      return false;
    }

    const normalized = normalizeChannelName(channel.name);
    return (
      normalized.includes("fantasy") &&
      normalized.includes("signup")
    );
  });

  if (!fallback?.id) {
    console.warn(
      'Could not find a Discord text channel matching "Fantasy Signups". Fantasy signup was still saved.',
    );
    return null;
  }

  return fallback.id;
}

export async function sendFantasySignupNotification({
  baseUrl,
  spotNumber,
  totalFilled,
  discordUsername,
  sleeperUsername,
  teamName,
}: FantasySignupNotificationInput): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();

  if (!botToken) {
    console.warn(
      "DISCORD_BOT_TOKEN is missing. Fantasy signup was saved, but no Discord post was sent.",
    );
    return false;
  }

  const channelId = await resolveFantasySignupChannel(botToken);

  if (!channelId) {
    return false;
  }

  const imageParams = new URLSearchParams({
    spot: String(spotNumber),
    discord: discordUsername,
    sleeper: sleeperUsername,
  });

  if (teamName) {
    imageParams.set("team", teamName);
  }

  const imageUrl =
    `${baseUrl.replace(/\/$/, "")}` +
    `/api/fantasy-signups/card?${imageParams.toString()}`;

  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allowed_mentions: {
          parse: [],
        },
        embeds: [
          {
            title: `🏆 FANTASY SPOT #${spotNumber} LOCKED`,
            description:
              `**@${discordUsername}** is officially in Gold Jacket Fantasy.`,
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
            image: {
              url: imageUrl,
            },
            footer: {
              text:
                `GOLD JACKET FANTASY • ${totalFilled} / 10 SPOTS FILLED`,
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
