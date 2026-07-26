import { supabaseAdmin } from "@/lib/supabase-admin";
import { findTeamFromDiscordRoleNames } from "@/lib/nfl-teams";

type DiscordGuildMember = {
  roles?: string[];
};

type DiscordGuildRole = {
  id: string;
  name: string;
};

export type TeamSyncResult = {
  team: string | null;
  changed: boolean;
  roleNames: string[];
};

export async function syncDiscordTeamAssignment(
  discordId: string,
): Promise<TeamSyncResult> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    throw new Error(
      "DISCORD_BOT_TOKEN or DISCORD_GUILD_ID is missing.",
    );
  }

  const headers = {
    Authorization: `Bot ${botToken}`,
  };

  const [memberResponse, rolesResponse] = await Promise.all([
    fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
      {
        headers,
        cache: "no-store",
      },
    ),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers,
      cache: "no-store",
    }),
  ]);

 if (memberResponse.status === 404) {
  await supabaseAdmin
    .from("members")
    .update({
      team: null,
      updated_at: new Date().toISOString(),
    })
    .eq("discord_id", discordId);

  return {
    team: null,
    changed: true,
    roleNames: [],
  };
}

  if (!memberResponse.ok || !rolesResponse.ok) {
    const memberText = await memberResponse.text();
    const rolesText = await rolesResponse.text();

  console.error("Discord team-role lookup failed");
console.error("memberStatus:", memberResponse.status);
console.error("rolesStatus:", rolesResponse.status);
console.error("memberText:", memberText);
console.error("rolesText:", rolesText);

    throw new Error("Unable to read Discord roles.");
  }

  const guildMember =
    (await memberResponse.json()) as DiscordGuildMember;

  const guildRoles =
    (await rolesResponse.json()) as DiscordGuildRole[];

  const memberRoleIds = new Set(guildMember.roles ?? []);

  const roleNames = guildRoles
  .filter((role) => memberRoleIds.has(role.id))
  .map((role) => role.name);

console.log("========== DISCORD TEAM DEBUG ==========");
console.log("Discord ID:", discordId);
console.log("Role IDs:", guildMember.roles);
console.log("Role Names:", roleNames);

const detectedTeam = findTeamFromDiscordRoleNames(roleNames);
const nextTeam = detectedTeam?.slug ?? null;

console.log("Detected Team:", nextTeam);
console.log("========================================");

console.log("================================");
console.log("Discord ID:", discordId);
console.log("Role names:", roleNames);
console.log("Detected team:", nextTeam);
console.log("================================");
console.log("Discord role names:", roleNames);
console.log("Detected NFL team:", nextTeam);
  const { data: currentMember, error: currentMemberError } =
    await supabaseAdmin
      .from("members")
      .select("id, team")
      .eq("discord_id", discordId)
      .maybeSingle();

  if (currentMemberError) {
    console.error(
      "Unable to load current member team:",
      currentMemberError,
    );
console.error(currentMemberError);
    throw new Error("Unable to load current website team.");
  }

  if (!currentMember) {
    return {
      team: nextTeam,
      changed: false,
      roleNames,
    };
  }

  const currentTeam = currentMember.team ?? null;

  if (currentTeam === nextTeam) {
    return {
      team: nextTeam,
      changed: false,
      roleNames,
    };
  }

  if (nextTeam) {
    const { error: clearError } = await supabaseAdmin
      .from("members")
      .update({
        team: null,
        updated_at: new Date().toISOString(),
      })
      .eq("team", nextTeam)
      .neq("discord_id", discordId);

    if (clearError) {
      console.error(
        "Unable to clear previous team owner:",
        clearError,
      );

      throw new Error(
        "Unable to transfer website team ownership.",
      );
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("members")
    .update({
      team: nextTeam,
      updated_at: new Date().toISOString(),
    })
    .eq("discord_id", discordId);

  if (updateError) {
    console.error(
      "Unable to update member team:",
      updateError,
    );
console.error(updateError);
    throw new Error("Unable to update website team.");
  }

  return {
    team: nextTeam,
    changed: true,
    roleNames,
  };
}