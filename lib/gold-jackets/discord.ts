import type { GoldJacketCandidate } from "@/lib/gold-jackets/catalog";
import type { NflTeam } from "@/lib/nfl-teams";

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
