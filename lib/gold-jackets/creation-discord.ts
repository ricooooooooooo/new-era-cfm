import {
  buildGoldJacketCreatorClaimComponents,
  makeGoldJacketCreatorClaimCustomId,
} from "./creator-claim.mjs";

import {
  getSystemwideGoldJacketCreationPreset,
  type SystemwideGoldJacketCreationRating,
} from "./systemwide-creation-presets";

type Team = {
  slug: string;
  city: string;
  name: string;
};

type Candidate = {
  key: string;
  name: string;
  position: string;
};

export type SystemwideGoldJacketCreationCardInput = {
  origin: string;
  claimId: string;

  team:
    Team;

  candidate:
    Candidate;

  displayName:
    string;

  discordId:
    string;

  alreadyCreated?:
    boolean;

  claimedByDiscordId?:
    string |
    null;

  claimedByDisplayName?:
    string |
    null;
};

export type SystemwideGoldJacketCreationCardResult =
  | {
      sent: true;
      messageId: string;
    }
  | {
      sent: false;
      error: string;
    };

function formatRatings(
  values:
    SystemwideGoldJacketCreationRating[]
) {
  const rows:
    string[] = [];

  for (
    let index = 0;
    index < values.length;
    index += 3
  ) {
    rows.push(
      values
        .slice(
          index,
          index + 3
        )
        .map(
          value =>
            `${value.code} ${value.value}`
        )
        .join(
          "     "
        )
    );
  }

  return (
    "```text\n" +
    rows.join("\n") +
    "\n```"
  );
}

function disabledButton(
  claimId:
    string,

  label:
    string
) {
  return [
    {
      type:
        1,

      components: [
        {
          type:
            2,

          style:
            3,

          custom_id:
            makeGoldJacketCreatorClaimCustomId(
              claimId
            ),

          label:
            label.slice(
              0,
              80
            ),

          disabled:
            true,
        },
      ],
    },
  ];
}

export async function sendSystemwideGoldJacketCreationCard(
  input:
    SystemwideGoldJacketCreationCardInput
): Promise<SystemwideGoldJacketCreationCardResult> {
  const token =
    process.env
      .DISCORD_BOT_TOKEN;

  if (
    !token
  ) {
    return {
      sent:
        false,

      error:
        "DISCORD_BOT_TOKEN is missing.",
    };
  }

  const channelId =
    process.env
      .DISCORD_GOLD_JACKET_CREATION_CHANNEL_ID ||
    "1543357118252322889";

  const roleId =
    process.env
      .DISCORD_GOLD_JACKET_ALERT_ROLE_ID ||
    process.env
      .DISCORD_CO_OWNER_ROLE_ID ||
    "";

  const preset =
    getSystemwideGoldJacketCreationPreset(
      input.candidate.key
    );

  if (
    !preset
  ) {
    return {
      sent:
        false,

      error:
        `No complete Gold Jacket creation preset exists for ${input.candidate.name}.`,
    };
  }

  const fields = [
    {
      name:
        "👤 PLAYER SETUP",

      value:
        `**Name:** ${preset.name}\n` +
        `**Historical Position:** ${preset.historicalPosition}\n` +
        `**Madden Position:** ${preset.position} — ${preset.positionName}\n` +
        `**Archetype:** ${preset.archetype}\n` +
        `**Jersey:** #${preset.jerseyNumber}\n` +
        `**College:** ${preset.college}\n` +
        `**Height:** ${preset.height}\n` +
        `**Weight:** ${preset.weight} lbs\n` +
        `**Age:** 20\n` +
        `**Overall Target:** EXACTLY 70\n` +
        `**Development:** ⭐ Superstar`,

      inline:
        false,
    },

    {
      name:
        "🔒 LOCKED PHYSICALS — DO NOT CHANGE",

      value:
        formatRatings(
          preset.physicalRatings
        ),

      inline:
        false,
    },

    {
      name:
        "🛠️ DEVELOPMENTAL RATINGS",

      value:
        formatRatings(
          preset.skillRatings
        ),

      inline:
        false,
    },

    {
      name:
        "💰 CONTRACT",

      value:
        `**Length:** ${preset.contract.years} Years\n` +
        `**Total Value:** $${preset.contract.totalValueMillions.toFixed(1)}M\n` +
        `**Guaranteed / Bonus:** $${preset.contract.guaranteedMillions.toFixed(1)}M`,

      inline:
        false,
    },

    {
      name:
        "⚠️ FINAL 70 OVR CHECK",

      value:
        "**PLAYER MUST DISPLAY EXACTLY 70 OVR.**\n\n" +
        `If Madden displays 69 or 71, adjust **${preset.calibrationRatings.join("**, then **")}** one point at a time until the displayed OVR is exactly 70.\n\n` +
        "**DO NOT lower the locked physical ratings merely to force the OVR.**",

      inline:
        false,
    },
  ];

  if (
    input.alreadyCreated
  ) {
    fields.push({
      name:
        "✅ STATUS",

      value:
        "**Already Created In-Game**\n" +
        "This card remains as the official Gold Jacket creation record.",

      inline:
        false,
    });
  } else if (
    input.claimedByDisplayName
  ) {
    fields.push({
      name:
        "✅ CLAIMED BY",

      value:
        input.claimedByDiscordId
          ? `<@${input.claimedByDiscordId}> • **${input.claimedByDisplayName}** is making this player.`
          : `**${input.claimedByDisplayName}** is making this player.`,

      inline:
        false,
    });
  }

  const components =
    input.alreadyCreated
      ? disabledButton(
          input.claimId,
          "✅ Already Created"
        )
      : input.claimedByDisplayName
        ? disabledButton(
            input.claimId,
            `✅ Claimed by ${input.claimedByDisplayName}`
          )
        : buildGoldJacketCreatorClaimComponents(
            input.claimId
          );

  const response =
    await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bot ${token}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            content:
              roleId
                ? `🚨 <@&${roleId}> Gold Jacket creation task.`
                : undefined,

            embeds: [
              {
                title:
                  "🛠️ GOLD JACKET CREATION CARD",

                description:
                  `**${preset.name}**\n` +
                  `${input.team.city} ${input.team.name}\n` +
                  `Selected by **${input.displayName}**`,

                color:
                  13938487,

                thumbnail: {
                  url:
                    `${input.origin}/api/gold-jackets/photo/${input.candidate.key}?team=${encodeURIComponent(input.team.slug)}`,
                },

                fields,

                footer: {
                  text:
                    "Gold Jacket • Age 20 • Target 70 OVR • Superstar",
                },

                timestamp:
                  new Date()
                    .toISOString(),
              },
            ],

            components,

            allowed_mentions: {
              roles:
                roleId
                  ? [roleId]
                  : [],

              users:
                [],
            },
          }),

        cache:
          "no-store",
      }
    );

  if (
    !response.ok
  ) {
    return {
      sent:
        false,

      error:
        `Discord ${response.status}: ${(await response.text()).slice(0, 400)}`,
    };
  }

  const result =
    await response.json() as {
      id?: unknown;
    };

  if (
    typeof result.id !==
    "string"
  ) {
    return {
      sent:
        false,

      error:
        "Discord returned no Gold Jacket creation message ID.",
    };
  }

  return {
    sent:
      true,

    messageId:
      result.id,
  };
}
