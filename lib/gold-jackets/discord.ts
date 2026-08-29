import type { GoldJacketCandidate } from "@/lib/gold-jackets/catalog";
import { getGoldJacketCreationPreset } from "@/lib/gold-jackets/creation-presets";
import type { NflTeam } from "@/lib/nfl-teams";


import { buildGoldJacketCreatorClaimComponents } from "@/lib/gold-jackets/creator-claim.mjs";
export type GoldJacketStaffAlertInput = {
  origin: string;
  team: NflTeam;
  candidate: GoldJacketCandidate;
  displayName: string;
  discordId: string;
};

export type GoldJacketStaffAlertResult =
  | { sent: true }
  | { sent: false; error: string };

type DiscordRole = {
  id: string;
  name: string;
};

function normalizeDiscordRoleName(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

async function resolveGoldJacketAlertRoleId(
  botToken: string,
): Promise<{ ok: true; roleId: string } | { ok: false; error: string }> {
  const explicitRoleId =
    process.env.DISCORD_GOLD_JACKET_ALERT_ROLE_ID ||
    process.env.DISCORD_CO_OWNER_ROLE_ID;

  if (explicitRoleId) {
    return { ok: true, roleId: explicitRoleId };
  }

  const guildId =
    process.env.DISCORD_GOLD_JACKET_GUILD_ID ||
    process.env.DISCORD_GUILD_ID ||
    process.env.DISCORD_SERVER_ID;
  const desiredRoleName =
    process.env.DISCORD_GOLD_JACKET_ALERT_ROLE_NAME || "co-owner";

  if (!guildId) {
    return {
      ok: false,
      error:
        "Missing DISCORD_GOLD_JACKET_ALERT_ROLE_ID (recommended) or DISCORD_GUILD_ID for co-owner role lookup.",
    };
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      {
        method: "GET",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const body = await response.text();
      return {
        ok: false,
        error: `Unable to load Discord roles (${response.status}): ${body.slice(0, 300)}`,
      };
    }

    const roles = (await response.json()) as DiscordRole[];
    const wanted = normalizeDiscordRoleName(desiredRoleName);

    const exact = roles.find(
      (role) => normalizeDiscordRoleName(role.name) === wanted,
    );

    if (exact?.id) {
      return { ok: true, roleId: exact.id };
    }

    return {
      ok: false,
      error:
        `Unable to find Discord role "${desiredRoleName}". Set DISCORD_GOLD_JACKET_ALERT_ROLE_ID for an exact role ping.`,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unknown Discord role lookup error",
    };
  }
}

export async function sendGoldJacketStaffAlert(
  input: GoldJacketStaffAlertInput,
): Promise<GoldJacketStaffAlertResult> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId =
    process.env.DISCORD_GOLD_JACKET_STAFF_CHANNEL_ID ||
    process.env.DISCORD_STAFF_CHAT_CHANNEL_ID ||
    process.env.DISCORD_STAFF_CHANNEL_ID;

  if (!botToken || !channelId) {
    return {
      sent: false,
      error:
        "Missing DISCORD_BOT_TOKEN or Gold Jacket Staff Chat channel ID.",
    };
  }

  const alertRole = await resolveGoldJacketAlertRoleId(botToken);
  if (!alertRole.ok) {
    return {
      sent: false,
      error: alertRole.error,
    };
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `🚨 <@&${alertRole.roleId}> new Gold Jacket to create.`,
          embeds: [
            {
              title: "🧥 GOLD JACKET INDUCTION",
              description: `**${input.displayName}** permanently inducted **${input.candidate.name}** for the **${input.team.city} ${input.team.name}**.`,
              color: 13938487,
              thumbnail: {
                url: `${input.origin}/api/gold-jackets/photo/${input.candidate.key}`,
              },
              fields: [
                {
                  name: "Create This Player",
                  value: `**${input.candidate.name}** • ${input.candidate.position}`,
                  inline: false,
                },
                {
                  name: "Madden Build",
                  value: "**Age 20 • 70 OVR • Superstar Dev**",
                  inline: false,
                },
                {
                  name: "Team",
                  value: `${input.team.city} ${input.team.name}`,
                  inline: true,
                },
                {
                  name: "Owner",
                  value: `<@${input.discordId}>`,
                  inline: true,
                },
              ],
              footer: {
                text: "Gold Jacket CFM • Permanent Selection • No Undo",
              },
              timestamp: new Date().toISOString(),
            },
          ],
          allowed_mentions: {
            roles: [alertRole.roleId],
            users: [input.discordId],
          },
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const body = await response.text();
      return {
        sent: false,
        error: `Discord ${response.status}: ${body.slice(0, 300)}`,
      };
    }

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Unknown Discord error",
    };
  }
}

export type GoldJacketCreationCardInput =
  GoldJacketStaffAlertInput & {
    claimId: string;
  };

export async function sendGoldJacketCreationCard(
  input: GoldJacketCreationCardInput,
): Promise<GoldJacketStaffAlertResult> {
  const botToken = process.env.DISCORD_BOT_TOKEN;

  /*
   * Dedicated mish-only creation channel.
   */
  const channelId =
    process.env.DISCORD_GOLD_JACKET_CREATION_CHANNEL_ID ||
    "1543357118252322889";

  if (!botToken) {
    return {
      sent: false,
      error:
        "Missing DISCORD_BOT_TOKEN for Gold Jacket creation card.",
    };
  }

  /*
   * Use the same Co-Owner role resolver as the existing
   * Gold Jacket workflow.
   */
  const alertRole =
    await resolveGoldJacketAlertRoleId(botToken);

  if (!alertRole.ok) {
    return {
      sent: false,
      error: alertRole.error,
    };
  }

  const preset = getGoldJacketCreationPreset(
    input.candidate.key,
    input.candidate.name,
  );

  const embed = preset
    ? {
        title: "🛠️ GOLD JACKET CREATION CARD",

        description:
          `**${preset.name}**\n` +
          `${input.team.city} ${input.team.name}\n` +
          `Selected by **${input.displayName}**`,

        color: 13938487,

        thumbnail: {
          url:
            `${input.origin}/api/gold-jackets/photo/` +
            `${input.candidate.key}`,
        },

        fields: [
          {
            name: "👤 PLAYER SETUP",
            value:
              `**Name:** ${preset.name}\n` +
              `**Position:** ${preset.position} — ${preset.positionName}\n` +
              `**Archetype:** ${preset.archetype}\n` +
              `**Jersey:** #${preset.jerseyNumber}\n` +
              `**College:** ${preset.college}\n` +
              `**Height:** ${preset.height}\n` +
              `**Weight:** ${preset.weight} lbs\n` +
              `**Age:** ${preset.age}\n` +
              `**Overall:** ${preset.overall} EXACT\n` +
              `**Development:** ⭐ ${preset.devTrait}`,

            inline: false,
          },

          {
            name:
              "🔒 LOCKED PHYSICALS — DO NOT CHANGE",

            value:
              "```text\n" +
              `SPD ${preset.lockedPhysicals.speed}    ` +
              `ACC ${preset.lockedPhysicals.acceleration}    ` +
              `STR ${preset.lockedPhysicals.strength}\n` +

              `AGI ${preset.lockedPhysicals.agility}    ` +
              `COD ${preset.lockedPhysicals.changeOfDirection}    ` +
              `JMP ${preset.lockedPhysicals.jumping}\n` +

              `STA ${preset.lockedPhysicals.stamina}    ` +
              `TGH ${preset.lockedPhysicals.toughness}    ` +
              `INJ ${preset.lockedPhysicals.injury}\n` +
              "```",

            inline: false,
          },

          {
            name:
              "🛠️ DEVELOPMENTAL RATINGS",

            value:
              "```text\n" +
              `AWR ${preset.developmentalRatings.awareness}    ` +
              `PRC ${preset.developmentalRatings.playRecognition}    ` +
              `TAK ${preset.developmentalRatings.tackle}\n` +

              `FMV ${preset.developmentalRatings.finesseMoves}    ` +
              `PMV ${preset.developmentalRatings.powerMoves}    ` +
              `BSH ${preset.developmentalRatings.blockShedding}\n` +

              `PUR ${preset.developmentalRatings.pursuit}    ` +
              `POW ${preset.developmentalRatings.hitPower}\n` +

              `MCV ${preset.developmentalRatings.manCoverage}    ` +
              `ZCV ${preset.developmentalRatings.zoneCoverage}    ` +
              `PRS ${preset.developmentalRatings.press}\n` +
              "```",

            inline: false,
          },


          {
            name: "💰 CONTRACT",

            value:
              `**Length:** ${preset.contract.years} Years\n` +
              `**Total Value:** ` +
              `$${preset.contract.totalValueMillions.toFixed(1)}M\n` +
              `**Guaranteed / Bonus:** ` +
              `$${preset.contract.guaranteedMillions.toFixed(1)}M\n\n` +
              "No No-Trade Clause\n" +
              "No Void Years\n" +
              "No Incentives",

            inline: false,
          },

          {
            name: "⚠️ FINAL 70 OVR CHECK",

            value:
              "**PLAYER MUST DISPLAY EXACTLY 70 OVR.**\n\n" +

              "If Madden shows 69 or 71, adjust " +
              "**AWR first**, then **PRC**, " +
              "one point at a time.\n\n" +

              "**DO NOT lower SPD, ACC, STR, AGI, " +
              "COD or the other locked physicals " +
              "to force 70 OVR.**",

            inline: false,
          },
        ],

        footer: {
          text:
            "Gold Jacket • Age 20 • " +
            "70 OVR • Superstar Creation Blueprint",
        },

        timestamp: new Date().toISOString(),
      }

    : {
        title: "⚠️ GOLD JACKET PRESET PENDING",

        description:
          `**${input.candidate.name}** was inducted by ` +
          `**${input.displayName}** for the ` +
          `**${input.team.city} ${input.team.name}**.`,

        color: 13938487,

        thumbnail: {
          url:
            `${input.origin}/api/gold-jackets/photo/` +
            `${input.candidate.key}`,
        },

        fields: [
          {
            name: "DO NOT CREATE THIS PLAYER YET",

            value:
              "This legend does not have an approved " +
              "70 OVR creation preset yet.\n\n" +
              "**DO NOT GUESS THE RATINGS.**\n" +
              "Research and approve the player's " +
              "preset first.",

            inline: false,
          },
        ],

        footer: {
          text:
            "Gold Jacket • Approved creation preset required",
        },

        timestamp: new Date().toISOString(),
      };

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",

        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          content:
            `🚨 <@&${alertRole.roleId}> ` +
            "Gold Jacket creation task.",

          embeds: [embed],

          components: preset
            ? buildGoldJacketCreatorClaimComponents(
                input.claimId,
              )
            : [],

          allowed_mentions: {
            roles: [alertRole.roleId],
          },
        }),

        cache: "no-store",
      },
    );

    if (!response.ok) {
      const body = await response.text();

      return {
        sent: false,
        error:
          `Gold Jacket creation channel Discord ` +
          `${response.status}: ${body.slice(0, 300)}`,
      };
    }

    return { sent: true };

  } catch (error) {
    return {
      sent: false,

      error:
        error instanceof Error
          ? error.message
          : "Unknown Gold Jacket creation channel error",
    };
  }
}
