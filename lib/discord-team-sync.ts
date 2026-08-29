import { supabaseAdmin } from "@/lib/supabase-admin";
import { canReconcileOfficialTeam } from "@/lib/gold-jacket-team-sync-core.mjs";
import {
  findTeamFromDiscordRoleNames,
  NFL_TEAMS,
} from "@/lib/nfl-teams";

type DiscordGuildMember = {
  roles?: string[];
};

type DiscordGuildRole = {
  id: string;
  name: string;
};

type WebsiteMember = {
  id: string;
  discord_id: string;
  discord_username: string | null;
  display_name: string | null;
  team: string | null;
  last_seen_at: string | null;
  updated_at: string | null;
  first_connected_at: string | null;
};

type WebsiteTeam = {
  id: string;
  city: string | null;
  name: string;
  abbreviation: string;
  owner_member_id: string | null;
};

export type TeamSyncResult = {
  team: string | null;
  changed: boolean;
  roleNames: string[];
};

export type BulkOwnerSyncResult = {
  totalTeams: number;
  assignedTeams: number;
  missingTeams: number;
  connectedMembers: number;
  duplicatesResolved: number;
  changedAssignments: number;
  assignments: {
    teamSlug: string;
    teamName: string;
    abbreviation: string;
    memberId: string;
    discordId: string;
    displayName: string;
  }[];
  missing: {
    teamSlug: string;
    teamName: string;
    abbreviation: string;
  }[];
  duplicates: {
    teamSlug: string;
    teamName: string;
    selected: string;
    ignored: string[];
  }[];
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveStoredTeam(value: string | null | undefined) {
  const normalized = normalize(value);

  if (!normalized) return null;

  return (
    NFL_TEAMS.find((team) => {
      const candidates = [
        team.slug,
        team.abbreviation,
        team.name,
        `${team.city} ${team.name}`,
        ...team.aliases,
      ].map(normalize);

      return candidates.includes(normalized);
    }) ?? null
  );
}

function memberTime(member: WebsiteMember) {
  return Date.parse(
    member.last_seen_at ||
      member.updated_at ||
      member.first_connected_at ||
      "1970-01-01T00:00:00.000Z",
  );
}

async function getGoldJacketLeagueId(): Promise<string | null> {
  const result = await supabaseAdmin
    .from("leagues")
    .select("id")
    .eq("slug", "gold-jacket-cfm")
    .eq("is_active", true)
    .maybeSingle();

  if (result.error) {
    console.error("Unable to resolve active Gold Jacket league:", result.error);
    return null;
  }

  return result.data?.id ?? null;
}

async function getCurrentWebsiteTeam(
  discordId: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("team")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load current website team:", error);
    throw new Error("Unable to load current website team.");
  }

  return data?.team ?? null;
}

async function reconcileOfficialTeamAssignment({
  memberId,
  discordId,
  teamSlug,
}: {
  memberId: string;
  discordId: string;
  teamSlug: string;
}) {
  const detectedTeam = resolveStoredTeam(teamSlug);

  if (!detectedTeam) {
    throw new Error(`Unknown NFL team: ${teamSlug}`);
  }

  const leagueId = await getGoldJacketLeagueId();

  // Gold Jacket intentionally starts unlinked. Until the new Madden
  // franchise exists, keep the Discord-detected team without touching
  // official teams.league_id UUID ownership records.
  if (!canReconcileOfficialTeam(leagueId)) {
    console.log("Gold Jacket team sync: league is not connected yet; skipping official team reconciliation.", {
      discordId,
      teamSlug: detectedTeam.slug,
    });
    return false;
  }

  const teamResult = await supabaseAdmin
    .from("teams")
    .select("id, owner_member_id")
    .eq("league_id", leagueId)
    .eq("abbreviation", detectedTeam.abbreviation)
    .maybeSingle();

  if (teamResult.error) throw teamResult.error;

  if (!teamResult.data) {
    throw new Error(
      `${detectedTeam.city} ${detectedTeam.name} is missing from the teams table.`,
    );
  }

  const currentMemberResult = await supabaseAdmin
    .from("members")
    .select("team")
    .eq("id", memberId)
    .maybeSingle();

  if (currentMemberResult.error) {
    throw currentMemberResult.error;
  }

  const currentMemberTeam =
    currentMemberResult.data?.team ?? null;
  const currentOfficialOwner =
    teamResult.data.owner_member_id ?? null;

  const changed =
    currentMemberTeam !== detectedTeam.slug ||
    currentOfficialOwner !== memberId;

  if (!changed) {
    return false;
  }

  const now = new Date().toISOString();

  const clearMemberFromOtherTeams = await supabaseAdmin
    .from("teams")
    .update({
      owner_member_id: null,
    })
    .eq("league_id", leagueId)
    .eq("owner_member_id", memberId)
    .neq("id", teamResult.data.id);

  if (clearMemberFromOtherTeams.error) {
    throw clearMemberFromOtherTeams.error;
  }

  if (
    currentOfficialOwner &&
    currentOfficialOwner !== memberId
  ) {
    const clearPreviousOwner = await supabaseAdmin
      .from("members")
      .update({
        team: null,
        updated_at: now,
      })
      .eq("id", currentOfficialOwner)
      .eq("team", detectedTeam.slug);

    if (clearPreviousOwner.error) {
      throw clearPreviousOwner.error;
    }
  }

  const clearDuplicateMemberTeam = await supabaseAdmin
    .from("members")
    .update({
      team: null,
      updated_at: now,
    })
    .eq("team", detectedTeam.slug)
    .neq("id", memberId);

  if (clearDuplicateMemberTeam.error) {
    throw clearDuplicateMemberTeam.error;
  }

  const updateMember = await supabaseAdmin
    .from("members")
    .update({
      team: detectedTeam.slug,
      updated_at: now,
    })
    .eq("id", memberId)
    .eq("discord_id", discordId);

  if (updateMember.error) {
    throw updateMember.error;
  }

  const updateTeam = await supabaseAdmin
    .from("teams")
    .update({
      owner_member_id: memberId,
    })
    .eq("id", teamResult.data.id);

  if (updateTeam.error) {
    throw updateTeam.error;
  }

  return true;
}

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
    fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      {
        headers,
        cache: "no-store",
      },
    ),
  ]);

  if (memberResponse.status === 404) {
    const currentTeam = await getCurrentWebsiteTeam(discordId);

    console.error(
      "Discord member was not found in the configured guild. Website team was left unchanged.",
    );

    return {
      team: currentTeam,
      changed: false,
      roleNames: [],
    };
  }

  if (!memberResponse.ok || !rolesResponse.ok) {
    const memberText = await memberResponse.text();
    const rolesText = await rolesResponse.text();

    console.error("Discord team-role lookup failed:", {
      memberStatus: memberResponse.status,
      rolesStatus: rolesResponse.status,
      memberText,
      rolesText,
    });

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

  const detectedTeam =
    findTeamFromDiscordRoleNames(roleNames);
  const nextTeam = detectedTeam?.slug ?? null;

  const currentMemberResult = await supabaseAdmin
    .from("members")
    .select("id, team")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (currentMemberResult.error) {
    console.error(
      "Unable to load current member team:",
      currentMemberResult.error,
    );

    throw new Error("Unable to load current website team.");
  }

  if (!currentMemberResult.data) {
    return {
      team: nextTeam,
      changed: false,
      roleNames,
    };
  }

  const currentTeam =
    currentMemberResult.data.team ?? null;

  console.log("Discord team sync:", {
    discordId,
    roleNames,
    currentTeam,
    detectedTeam: nextTeam,
  });

  // Preserve the current assignment when Discord temporarily returns
  // no recognizable NFL team role.
  if (!nextTeam) {
    return {
      team: currentTeam,
      changed: false,
      roleNames,
    };
  }

  const changed = await reconcileOfficialTeamAssignment({
    memberId: currentMemberResult.data.id,
    discordId,
    teamSlug: nextTeam,
  });

  return {
    team: nextTeam,
    changed,
    roleNames,
  };
}

export async function syncAllOfficialTeamOwnersFromMembers():
  Promise<BulkOwnerSyncResult> {
  const leagueId = await getGoldJacketLeagueId();

  const [teamsResult, membersResult] = await Promise.all([
    supabaseAdmin
      .from("teams")
      .select(
        "id, city, name, abbreviation, owner_member_id",
      )
      .eq("league_id", leagueId)
      .order("city", { ascending: true }),

    supabaseAdmin
      .from("members")
      .select(
        "id, discord_id, discord_username, display_name, team, last_seen_at, updated_at, first_connected_at",
      )
      .not("discord_id", "is", null)
      .not("team", "is", null),
  ]);

  if (teamsResult.error) throw teamsResult.error;
  if (membersResult.error) throw membersResult.error;

  const teams = (teamsResult.data ?? []) as WebsiteTeam[];
  const members =
    (membersResult.data ?? []) as WebsiteMember[];

  if (teams.length === 0) {
    throw new Error("No GOLD JACKET teams were found.");
  }

  const membersByTeam = new Map<
    string,
    WebsiteMember[]
  >();

  for (const member of members) {
    const resolved = resolveStoredTeam(member.team);

    if (!resolved) continue;

    const existing =
      membersByTeam.get(resolved.slug) ?? [];

    existing.push(member);
    membersByTeam.set(resolved.slug, existing);
  }

  const assignments: BulkOwnerSyncResult["assignments"] =
    [];
  const missing: BulkOwnerSyncResult["missing"] = [];
  const duplicates: BulkOwnerSyncResult["duplicates"] =
    [];

  const winnerByTeam = new Map<
    string,
    WebsiteMember
  >();

  for (const team of teams) {
    const definition = NFL_TEAMS.find(
      (candidate) =>
        candidate.abbreviation === team.abbreviation,
    );

    if (!definition) continue;

    const candidates = [
      ...(membersByTeam.get(definition.slug) ?? []),
    ].sort((left, right) => {
      if (
        left.id === team.owner_member_id &&
        right.id !== team.owner_member_id
      ) {
        return -1;
      }

      if (
        right.id === team.owner_member_id &&
        left.id !== team.owner_member_id
      ) {
        return 1;
      }

      return memberTime(right) - memberTime(left);
    });

    const winner = candidates[0] ?? null;

    if (!winner) {
      missing.push({
        teamSlug: definition.slug,
        teamName: `${definition.city} ${definition.name}`,
        abbreviation: definition.abbreviation,
      });
      continue;
    }

    winnerByTeam.set(definition.slug, winner);

    assignments.push({
      teamSlug: definition.slug,
      teamName: `${definition.city} ${definition.name}`,
      abbreviation: definition.abbreviation,
      memberId: winner.id,
      discordId: winner.discord_id,
      displayName:
        winner.display_name ||
        winner.discord_username ||
        winner.discord_id,
    });

    if (candidates.length > 1) {
      duplicates.push({
        teamSlug: definition.slug,
        teamName: `${definition.city} ${definition.name}`,
        selected:
          winner.display_name ||
          winner.discord_username ||
          winner.discord_id,
        ignored: candidates.slice(1).map(
          (member) =>
            member.display_name ||
            member.discord_username ||
            member.discord_id,
        ),
      });
    }
  }

  if (assignments.length === 0) {
    throw new Error(
      "No connected members have recognized NFL team assignments.",
    );
  }

  const previousOwnerByTeam = new Map(
    teams.map((team) => [
      team.abbreviation,
      team.owner_member_id,
    ]),
  );

  // Rebuild the official ownership map from the connected member
  // assignments. This removes stale assignments such as an owner
  // appearing under the wrong team in League Health.
  const clearTeams = await supabaseAdmin
    .from("teams")
    .update({
      owner_member_id: null,
    })
    .eq("league_id", leagueId)
    .not("owner_member_id", "is", null);

  if (clearTeams.error) throw clearTeams.error;

  let changedAssignments = 0;
  const now = new Date().toISOString();

  for (const assignment of assignments) {
    const clearDuplicateMembers = await supabaseAdmin
      .from("members")
      .update({
        team: null,
        updated_at: now,
      })
      .eq("team", assignment.teamSlug)
      .neq("id", assignment.memberId);

    if (clearDuplicateMembers.error) {
      throw clearDuplicateMembers.error;
    }

    const updateMember = await supabaseAdmin
      .from("members")
      .update({
        team: assignment.teamSlug,
        updated_at: now,
      })
      .eq("id", assignment.memberId);

    if (updateMember.error) throw updateMember.error;

    const updateTeam = await supabaseAdmin
      .from("teams")
      .update({
        owner_member_id: assignment.memberId,
      })
      .eq("league_id", leagueId)
      .eq("abbreviation", assignment.abbreviation);

    if (updateTeam.error) throw updateTeam.error;

    if (
      previousOwnerByTeam.get(
        assignment.abbreviation,
      ) !== assignment.memberId
    ) {
      changedAssignments += 1;
    }
  }

  return {
    totalTeams: teams.length,
    assignedTeams: assignments.length,
    missingTeams: missing.length,
    connectedMembers: members.length,
    duplicatesResolved: duplicates.length,
    changedAssignments,
    assignments,
    missing,
    duplicates,
  };
}
