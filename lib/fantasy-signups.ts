export type FantasySignup = {
  discordUsername: string;
  sleeperUsername: string;
  teamName: string | null;
};

type DiscordChannel = {
  id: string;
  name: string;
  type: number;
};

type DiscordEmbedField = {
  name?: string;
  value?: string;
};

type DiscordMessage = {
  id: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    fields?: DiscordEmbedField[];
    footer?: { text?: string };
  }>;
};

export type FantasySignupState = {
  configured: boolean;
  channelId: string | null;
  signupCount: number;
  signups: FantasySignup[];
  error?: string;
};

const SIGNUP_FOOTER = "Gold Jacket Fantasy • 10-Team PPR • $10 Buy-In";

export function normalizeFantasyHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function normalizeChannelName(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function fieldValue(fields: DiscordEmbedField[] | undefined, name: string) {
  return fields?.find((field) => field.name?.toLowerCase() === name.toLowerCase())?.value?.trim() || "";
}

function parseDiscordFromDescription(description: string | undefined) {
  const match = description?.match(/^\*\*(.+?)\*\* just joined the fantasy signup list\./i);
  return match?.[1]?.trim() || "";
}

export function parseFantasySignupMessages(messages: DiscordMessage[]): FantasySignup[] {
  const signups: FantasySignup[] = [];
  const seenDiscord = new Set<string>();
  const seenSleeper = new Set<string>();

  for (const message of messages) {
    const embed = message.embeds?.find(
      (candidate) =>
        candidate.footer?.text === SIGNUP_FOOTER ||
        candidate.title?.toLowerCase().includes("gold jacket fantasy"),
    );
    if (!embed) continue;

    const discordUsername = fieldValue(embed.fields, "Discord") || parseDiscordFromDescription(embed.description);
    const sleeperUsername = fieldValue(embed.fields, "Sleeper").replace(/^@/, "");
    const teamValue = fieldValue(embed.fields, "Team Name");
    const teamName = teamValue && teamValue.toLowerCase() !== "pending" ? teamValue : null;

    if (!discordUsername || !sleeperUsername) continue;

    const discordKey = normalizeFantasyHandle(discordUsername);
    const sleeperKey = normalizeFantasyHandle(sleeperUsername);
    if (seenDiscord.has(discordKey) || seenSleeper.has(sleeperKey)) continue;

    seenDiscord.add(discordKey);
    seenSleeper.add(sleeperKey);
    signups.push({ discordUsername, sleeperUsername, teamName });
  }

  return signups.slice(0, 10);
}

export async function resolveFantasySignupChannel() {
  const configured = process.env.DISCORD_FANTASY_SIGNUPS_CHANNEL_ID?.trim();
  if (configured) return configured;

  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!botToken || !guildId) return null;

  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const channels = (await response.json()) as DiscordChannel[];
  const match = channels.find((channel) => {
    if (channel.type !== 0) return false;
    const name = normalizeChannelName(channel.name);
    return name.includes("fantasysignups") || name.includes("fantasysignup");
  });

  return match?.id ?? null;
}

export async function getFantasySignupState(): Promise<FantasySignupState> {
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!botToken || !guildId) {
    return {
      configured: false,
      channelId: null,
      signupCount: 0,
      signups: [],
      error: "discord_not_configured",
    };
  }

  let channelId: string | null = null;
  try {
    channelId = await resolveFantasySignupChannel();
  } catch (error) {
    console.error("Unable to resolve Fantasy Signups channel:", error);
    return {
      configured: false,
      channelId: null,
      signupCount: 0,
      signups: [],
      error: "fantasy_signup_channel_lookup_failed",
    };
  }

  if (!channelId) {
    return {
      configured: false,
      channelId: null,
      signupCount: 0,
      signups: [],
      error: "fantasy_signup_channel_not_found",
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=100`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("Unable to read Fantasy Signups channel:", error);
    return {
      configured: false,
      channelId,
      signupCount: 0,
      signups: [],
      error: "discord_messages_unavailable",
    };
  }

  if (!response.ok) {
    return {
      configured: false,
      channelId,
      signupCount: 0,
      signups: [],
      error: `discord_messages_${response.status}`,
    };
  }

  const messages = (await response.json()) as DiscordMessage[];
  const signups = parseFantasySignupMessages(messages);

  return {
    configured: true,
    channelId,
    signupCount: signups.length,
    signups,
  };
}
