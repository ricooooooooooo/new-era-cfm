import {
  selectExactDiscordMember,
  type DiscordGuildMember,
} from "@/lib/discord/fantasy-member";

type FantasySignupNotificationInput = {
  baseUrl: string;
  spotNumber: number;
  totalFilled: number;
  discordUsername: string;
  sleeperUsername: string;
};

type DiscordChannel = {
  id?: string;
  name?: string;
  type?: number;
};

const GOLD = 0xd4af37;
const TARGET_CHANNEL = "fantasy-signups";

export const SLEEPER_INVITE_URL =
  "http://sleeper.com/i/Y28Mj5mRaOdla";

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

  if (configured) return configured;

  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!guildId) return null;

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/channels`,
    {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const channels = (await response.json()) as DiscordChannel[];

  const exact = channels.find((channel) => {
    const validType = channel.type === 0 || channel.type === 5;
    return (
      validType &&
      typeof channel.name === "string" &&
      normalizeChannelName(channel.name) === TARGET_CHANNEL
    );
  });

  if (exact?.id) return exact.id;

  return (
    channels.find((channel) => {
      if (
        (channel.type !== 0 && channel.type !== 5) ||
        typeof channel.name !== "string"
      ) {
        return false;
      }

      const normalized = normalizeChannelName(channel.name);
      return normalized.includes("fantasy") && normalized.includes("signup");
    })?.id ?? null
  );
}

async function findDiscordMemberId(
  botToken: string,
  discordUsername: string,
): Promise<string | null> {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!guildId) return null;

  const query = discordUsername.trim().replace(/^@+/, "");

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=100`,
    {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.warn(
      `Discord member search failed (${response.status}). Signup remains valid.`,
    );
    return null;
  }

  const members = (await response.json()) as DiscordGuildMember[];
  return selectExactDiscordMember(members, discordUsername)?.user?.id ?? null;
}

async function sendSleeperInviteDm(
  botToken: string,
  discordUsername: string,
): Promise<boolean> {
  const recipientId = await findDiscordMemberId(
    botToken,
    discordUsername,
  );

  if (!recipientId) return false;

  const dmResponse = await fetch(
    "https://discord.com/api/v10/users/@me/channels",
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: recipientId }),
      cache: "no-store",
    },
  );

  if (!dmResponse.ok) return false;

  const dmChannel = (await dmResponse.json()) as { id?: string };
  if (!dmChannel.id) return false;

  const messageResponse = await fetch(
    `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content:
          "🏆 **You claimed a Gold Jacket Fantasy spot.**\n\nJoin the Sleeper league below:",
        allowed_mentions: { parse: [] },
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: "Join Gold Jacket Fantasy",
                url: SLEEPER_INVITE_URL,
                emoji: { name: "🏈" },
              },
            ],
          },
        ],
      }),
      cache: "no-store",
    },
  );

  return messageResponse.ok;
}

export async function sendFantasySignupNotification({
  baseUrl,
  spotNumber,
  totalFilled,
  discordUsername,
  sleeperUsername,
}: FantasySignupNotificationInput): Promise<{
  channelPosted: boolean;
  inviteDmSent: boolean;
}> {
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();

  if (!botToken) {
    return { channelPosted: false, inviteDmSent: false };
  }

  const imageParams = new URLSearchParams({
    spot: String(spotNumber),
    discord: discordUsername,
    sleeper: sleeperUsername,
  });

  const imageUrl =
    `${baseUrl.replace(/\/$/, "")}` +
    `/api/fantasy-signups/card?${imageParams.toString()}`;

  let channelPosted = false;
  const channelId = await resolveFantasySignupChannel(botToken);

  if (channelId) {
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
                  name: "League",
                  value: "10-Team PPR • Sleeper • $10 Buy-In",
                  inline: false,
                },
              ],
              image: { url: imageUrl },
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

    channelPosted = response.ok;
  }

  const inviteDmSent = await sendSleeperInviteDm(
    botToken,
    discordUsername,
  );

  return { channelPosted, inviteDmSent };
}
