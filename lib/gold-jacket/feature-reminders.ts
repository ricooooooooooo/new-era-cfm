type DiscordChannel = {
  id: string;
  name: string;
  type: number;
};

const FEATURES = [
  {
    icon:
      "🕵️",

    title:
      "SCOUT YOUR OPPONENT",

    text:
      "Your matchup intelligence report shows recent form, scoring profile, Owner OVR, threat level and rivalry history. Use it before you play.",

    path:
      "/era#scout",

    button:
      "Open Scout Report",
  },

  {
    icon:
      "🧠",

    title:
      "CHECK YOUR OWNER DNA",

    text:
      "Gold Jacket gives you a live Owner OVR, archetype, offense, defense, clutch and dominance ratings based on what you actually do in Madden.",

    path:
      "/era#dna",

    button:
      "View Owner DNA",
  },

  {
    icon:
      "👑",

    title:
      "WHO HAS THE BELT?",

    text:
      "The Gold Jacket Championship Belt transfers whenever the holder loses. Check the current champion and the full belt lineage.",

    path:
      "/era#belt",

    button:
      "View The Belt",
  },

  {
    icon:
      "🚨",

    title:
      "FRAUD WATCH",

    text:
      "A good record doesn't always mean a good team. Gold Jacket automatically flags suspicious records using scoring margin and close-game results.",

    path:
      "/era#fraud",

    button:
      "See Fraud Watch",
  },

  {
    icon:
      "⚔️",

    title:
      "RIVALRY INTELLIGENCE",

    text:
      "Playing somebody you've seen before? Gold Jacket remembers the series, average margin and rivalry heat automatically.",

    path:
      "/era#rivalry",

    button:
      "Check Rivalries",
  },

  {
    icon:
      "🏆",

    title:
      "SECRET ACHIEVEMENTS",

    text:
      "Your franchise can unlock hidden Gold Jacket achievements from actual Madden results. Some requirements stay hidden until you unlock them.",

    path:
      "/era#achievements",

    button:
      "Check Unlocks",
  },

  {
    icon:
      "📺",

    title:
      "AUTOMATIC GAME RECAPS",

    text:
      "Every completed Gold Jacket game becomes part of the league story automatically. Check the latest results and recap headlines.",

    path:
      "/era#recaps",

    button:
      "Read Recaps",
  },

  {
    icon:
      "📜",

    title:
      "THE GOLD JACKET UNIVERSE",

    text:
      "GOTWs, POTWs, big results and league moments are becoming permanent Gold Jacket history instead of disappearing in Discord.",

    path:
      "/era#universe",

    button:
      "Open The Universe",
  },

  {
    icon:
      "📲",

    title:
      "YOUR GOLD JACKET WRAPPED",

    text:
      "Record, streak, scoring average, point differential and your latest Madden result are waiting on your personal Wrapped card.",

    path:
      "/era#wrapped",

    button:
      "See My Wrapped",
  },
];

function normalized(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "",
    );
}

function channelScore(
  name: string,
) {
  const value =
    normalized(name);

  if (
    /rules|announcement|gotw|potw|trade|staff|admin|logs|bot|prediction|sportsbook|activecheck/.test(
      value,
    )
  ) {
    return -1000;
  }

  if (
    value === "general"
  ) {
    return 100;
  }

  if (
    value.includes(
      "leaguechat",
    )
  ) {
    return 95;
  }

  if (
    value.includes(
      "goldjacketchat",
    )
  ) {
    return 92;
  }

  if (
    value === "chat"
  ) {
    return 90;
  }

  if (
    value.includes(
      "generalchat",
    )
  ) {
    return 88;
  }

  if (
    value.includes(
      "cfmchat",
    )
  ) {
    return 86;
  }

  if (
    value.includes(
      "chat",
    )
  ) {
    return 70;
  }

  return 0;
}

async function discordRequest<T>(
  path: string,
  init:
    RequestInit = {},
): Promise<T | null> {
  const token =
    process.env.DISCORD_BOT_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "DISCORD_BOT_TOKEN is missing.",
    );
  }

  const response =
    await fetch(
      `https://discord.com/api/v10${path}`,
      {
        ...init,

        headers: {
          Authorization:
            `Bot ${token}`,

          ...(init.body
            ? {
                "content-type":
                  "application/json",
              }
            : {}),

          ...(init.headers ??
            {}),
        },

        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Discord ${response.status}: ${text.slice(
        0,
        500,
      )}`,
    );
  }

  return text
    ? JSON.parse(
        text,
      )
    : null;
}

function featureSlashCommand(
  title: string,
) {
  const value =
    title.toUpperCase();

  if (value.includes("SCOUT")) return "/scout";
  if (value.includes("DNA")) return "/dna";
  if (value.includes("BELT")) return "/belt";
  if (value.includes("FRAUD")) return "/fraud";
  if (value.includes("RIVALRY")) return "/rivalry";
  if (value.includes("ACHIEVEMENT")) return "/achievements";
  if (value.includes("RECAP")) return "/recaps";
  if (value.includes("WRAPPED")) return "/wrapped";

  return "/goldjacket";
}

async function resolveChannel() {
  const override =
    process.env.DISCORD_FEATURE_CHANNEL_ID?.trim();

  if (override) {
    return override;
  }

  const guildId =
    process.env.DISCORD_GUILD_ID?.trim();

  if (!guildId) {
    throw new Error(
      "DISCORD_GUILD_ID is missing.",
    );
  }

  const channels =
    (
      await discordRequest<
        DiscordChannel[]
      >(
        `/guilds/${guildId}/channels`,
      )
    ) ?? [];

  const ranked =
    channels
      .filter(
        (channel) =>
          channel.type === 0,
      )
      .map(
        (channel) => ({
          channel,

          score:
            channelScore(
              channel.name,
            ),
        }),
      )
      .filter(
        (item) =>
          item.score > 0,
      )
      .sort(
        (a, b) =>
          b.score -
          a.score,
      );

  if (
    !ranked.length
  ) {
    throw new Error(
      "Could not auto-detect a normal league chat channel. Set DISCORD_FEATURE_CHANNEL_ID if needed.",
    );
  }

  return ranked[0]
    .channel.id;
}

export async function postFeatureReminder() {
  const channelId =
    await resolveChannel();

  /*
   * Rotates every 2 days without needing
   * another database table.
   */
  const rotation =
    Math.floor(
      Date.now() /
        (
          1000 *
          60 *
          60 *
          24 *
          2
        ),
    );

  const feature =
    FEATURES[
      rotation %
        FEATURES.length
    ];

  const site =
    (
      process.env
        .NEXT_PUBLIC_SITE_URL ||
      process.env
        .SITE_URL ||
      "https://gold-jacket-cfm.vercel.app"
    ).replace(
      /\/+$/,
      "",
    );

  const url =
    `${site}${feature.path}`;

  await discordRequest(
    `/channels/${channelId}/messages`,
    {
      method:
        "POST",

      body:
        JSON.stringify({
          embeds: [
            {
              title:
                `${feature.icon} ${feature.title}`,

              description:
                `${feature.text}\n\n💬 **Discord:** \`${featureSlashCommand(
                  feature.title,
                )}\`\n\n**Gold Jacket isn't just standings. Use the tools.**`,

              color:
                0xd4af37,

              footer: {
                text:
                  "GOLD JACKET • FEATURE SPOTLIGHT",
              },
            },
          ],

          components: [
            {
              type: 1,

              components: [
                {
                  type: 2,

                  style: 5,

                  label:
                    feature.button,

                  url,
                },
              ],
            },
          ],

          allowed_mentions: {
            parse: [],
          },
        }),
    },
  );

  return {
    channelId,

    feature:
      feature.title,

    url,
  };
}
