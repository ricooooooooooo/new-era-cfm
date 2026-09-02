import { NFL_TEAMS } from "@/lib/nfl-teams";

type DiscordGuildMember = {
  roles?: string[];
};

type DiscordGuildRole = {
  id: string;
  name: string;
};

export type LiveDiscordTeam = {
  teamSlug: string | null;
  roleNames: string[];
};

let cachedRolesPromise:
  | Promise<DiscordGuildRole[]>
  | null = null;

function normalize(value: unknown) {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
    : "";
}

function teamMatchesRole(
  roleName: string,
  team: (typeof NFL_TEAMS)[number],
) {
  const role = normalize(roleName);
  if (!role) return false;

  const candidates = [
    team.slug,
    team.abbreviation,
    team.name,
    `${team.city} ${team.name}`,
    ...(Array.isArray(team.aliases)
      ? team.aliases
      : []),
  ]
    .map(normalize)
    .filter(Boolean);

  return candidates.some(
    (candidate) =>
      role === candidate ||
      role.endsWith(` ${candidate}`) ||
      role.startsWith(`${candidate} `),
  );
}

async function getGuildRoles(
  botToken: string,
  guildId: string,
) {
  if (!cachedRolesPromise) {
    cachedRolesPromise = fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: "no-store",
      },
    ).then(async (response) => {
      if (!response.ok) {
        const body =
          await response.text();

        throw new Error(
          `Discord role lookup failed (${response.status}): ${body.slice(0, 250)}`,
        );
      }

      return (
        (await response.json()) as
          DiscordGuildRole[]
      );
    });
  }

  return cachedRolesPromise;
}

export async function resolveLiveDiscordTeam(
  discordId: string,
): Promise<LiveDiscordTeam> {
  const botToken =
    process.env.DISCORD_BOT_TOKEN?.trim();

  const guildId =
    process.env.DISCORD_GUILD_ID?.trim() ||
    process.env.DISCORD_GOLD_JACKET_GUILD_ID?.trim() ||
    process.env.DISCORD_SERVER_ID?.trim();

  if (!botToken || !guildId) {
    throw new Error(
      "DISCORD_BOT_TOKEN or Discord guild ID is missing.",
    );
  }

  const [memberResponse, guildRoles] =
    await Promise.all([
      fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
        {
          headers: {
            Authorization:
              `Bot ${botToken}`,
          },
          cache: "no-store",
        },
      ),
      getGuildRoles(
        botToken,
        guildId,
      ),
    ]);

  if (memberResponse.status === 404) {
    return {
      teamSlug: null,
      roleNames: [],
    };
  }

  if (!memberResponse.ok) {
    const body =
      await memberResponse.text();

    throw new Error(
      `Discord member lookup failed (${memberResponse.status}): ${body.slice(0, 250)}`,
    );
  }

  const member =
    (await memberResponse.json()) as
      DiscordGuildMember;

  const memberRoleIds =
    new Set(member.roles ?? []);

  const roleNames =
    guildRoles
      .filter((role) =>
        memberRoleIds.has(role.id),
      )
      .map((role) => role.name);

  const matches =
    NFL_TEAMS.filter((team) =>
      roleNames.some((roleName) =>
        teamMatchesRole(
          roleName,
          team,
        ),
      ),
    );

  if (matches.length > 1) {
    throw new Error(
      `Discord user ${discordId} has multiple NFL team roles: ${matches
        .map((team) => team.slug)
        .join(", ")}`,
    );
  }

  return {
    teamSlug:
      matches[0]?.slug ?? null,
    roleNames,
  };
}
