import fs from "node:fs";

const DISCORD_API = "https://discord.com/api/v10";
const GOLD = 0xd4af37;
const OFFICIAL_MARKER = "GOLD JACKET FANTASY • OFFICIAL INFO";
const SLEEPER_INVITE = "https://sleeper.com/i/Y28Mj5mRaOdla";

function loadLocalEnv() {
  if (!fs.existsSync(".env.local")) return;
  const lines = fs.readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function normalizeChannelName(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLowerCase()
    .trim();
}

async function discordRequest(path, token, init = {}) {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const body = await response.text();
  let parsed = null;
  if (body) {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }
  }

  if (!response.ok) {
    throw new Error(
      `Discord ${init.method ?? "GET"} ${path} failed (${response.status}): ${body}`,
    );
  }

  return parsed;
}

function resolveSiteBase() {
  const raw =
    process.env.GOLD_JACKET_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    "";
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/$/, "");
}

async function resolveFantasyInfoChannel(token, guildId) {
  const configured = process.env.FANTASY_INFO_CHANNEL_ID?.trim();
  if (configured) return configured;

  const channels = await discordRequest(`/guilds/${guildId}/channels`, token);
  const textChannels = (Array.isArray(channels) ? channels : []).filter(
    (channel) => channel && (channel.type === 0 || channel.type === 5),
  );

  const ranked = textChannels
    .map((channel) => {
      const name = normalizeChannelName(channel.name);
      let score = 0;
      if (name === "fantasy info" || name === "fantasy information") score += 100;
      if (name.includes("fantasy")) score += 40;
      if (name.includes("info") || name.includes("information")) score += 30;
      if (name.includes("signup")) score -= 10;
      return { channel, score, name };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked[0] || ranked[0].score < 60) {
    const names = textChannels.map((channel) => channel.name).join(", ");
    throw new Error(
      "Could not confidently find the Fantasy Info channel. " +
        "Set FANTASY_INFO_CHANNEL_ID in .env.local and rerun npm run post:fantasy-info. " +
        `Visible text channels: ${names}`,
    );
  }

  console.log(`Auto-detected Fantasy Info channel: #${ranked[0].channel.name}`);
  return ranked[0].channel.id;
}

function buildPayload() {
  const siteBase = resolveSiteBase();
  const roleId = process.env.FANTASY_ROLE_ID?.trim();
  const components = [
    {
      type: 2,
      style: 5,
      label: "Join Sleeper League",
      url: SLEEPER_INVITE,
    },
  ];

  if (siteBase) {
    components.push({
      type: 2,
      style: 5,
      label: "Fantasy Signup",
      url: `${siteBase}/fantasy`,
    });
  }

  return {
    content: roleId ? `<@&${roleId}>` : "",
    allowed_mentions: roleId ? { roles: [roleId] } : { parse: [] },
    embeds: [
      {
        title: "🏆 𝐆𝐨𝐥𝐝 𝐉𝐚𝐜𝐤𝐞𝐭 𝐅𝐚𝐧𝐭𝐚𝐬𝐲 𝐅𝐨𝐨𝐭𝐛𝐚𝐥𝐥 🏆",
        description:
          "Welcome to **Gold Jacket Fantasy Football** — the official fantasy league for the Gold Jacket community. " +
          "This is meant to be a fun, competitive side league with a real prize pool and something we can bring back every season. " +
          "Keep it competitive, keep it active, and have fun with it. If you have any questions, reach out to staff.",
        color: GOLD,
        fields: [
          { name: "📱 𝐀𝐩𝐩", value: "**Sleeper**", inline: true },
          { name: "👥 𝐋𝐞𝐚𝐠𝐮𝐞 𝐒𝐢𝐳𝐞", value: "**10 Teams**", inline: true },
          { name: "🏈 𝐒𝐜𝐨𝐫𝐢𝐧𝐠", value: "**PPR**", inline: true },
          { name: "💳 𝐁𝐮𝐲 𝐈𝐧", value: "**$10**", inline: true },
          {
            name: "🔒 𝐏𝐚𝐲𝐦𝐞𝐧𝐭𝐬",
            value: "**Handled directly through Sleeper's built-in payment system**",
            inline: false,
          },
          { name: "🐍 𝐃𝐫𝐚𝐟𝐭 𝐓𝐲𝐩𝐞", value: "**Snake Draft**", inline: true },
          { name: "📅 𝐃𝐫𝐚𝐟𝐭 𝐃𝐚𝐭𝐞", value: "**TBD**", inline: true },
        ],
        footer: { text: OFFICIAL_MARKER },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [{ type: 1, components }],
  };
}

async function main() {
  loadLocalEnv();
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();

  if (!token || !guildId) {
    throw new Error(
      "DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required to post the Fantasy Info embed.",
    );
  }

  const channelId = await resolveFantasyInfoChannel(token, guildId);
  const payload = buildPayload();
  const recent = await discordRequest(`/channels/${channelId}/messages?limit=50`, token);
  const existing = (Array.isArray(recent) ? recent : []).find((message) =>
    message?.embeds?.some((embed) => embed?.footer?.text === OFFICIAL_MARKER),
  );

  let message;
  if (existing?.id) {
    message = await discordRequest(
      `/channels/${channelId}/messages/${existing.id}`,
      token,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
    console.log("Updated existing Gold Jacket Fantasy Info embed.");
  } else {
    message = await discordRequest(`/channels/${channelId}/messages`, token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log("Posted Gold Jacket Fantasy Info embed.");
  }

  console.log(`Channel ID: ${channelId}`);
  console.log(`Message ID: ${message.id}`);
  console.log(`Discord link: https://discord.com/channels/${guildId}/${channelId}/${message.id}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
