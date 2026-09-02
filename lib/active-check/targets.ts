import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  NFL_TEAMS,
  findTeamsFromDiscordRoleNames,
} from "@/lib/nfl-teams";

import {
  planTeamCentricReconciliation,
  resolveTeamCentricEligibility,
  type ActiveCheckOwnerCandidate,
  type StrictActiveCheckTarget,
} from "./target-snapshot-core.mjs";

type WebsiteMember = {
  id: string;
  discord_id: string;
  discord_username: string | null;
  display_name: string | null;
};

type DiscordGuildRole = {
  id: string;
  name: string;
};

type DiscordGuildMember = {
  user?: {
    id?: string;
    username?: string;
    global_name?: string | null;
    bot?: boolean;
  };
  nick?: string | null;
  roles?: string[];
};

type DiscordRateLimitBody = {
  retry_after?: number;
};

const DISCORD_API = "https://discord.com/api/v10";

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function discordFetch(
  url: string,
  botToken: string,
  options: RequestInit = {},
  maxAttempts = 5,
) {
  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt += 1
  ) {
    const response = await fetch(
      url,
      {
        ...options,
        headers: {
          Authorization: `Bot ${botToken}`,
          ...(options.headers ?? {}),
        },
        cache: "no-store",
      },
    );

    if (response.status !== 429) {
      return response;
    }

    const raw = await response
      .clone()
      .json()
      .catch(() => ({})) as DiscordRateLimitBody;

    const retrySeconds =
      Number(raw.retry_after);

    const retryMs =
      Number.isFinite(retrySeconds) &&
      retrySeconds > 0
        ? Math.ceil(
            retrySeconds * 1000,
          ) + 100
        : 1100;

    if (attempt === maxAttempts) {
      const body =
        await response.text();

      throw new Error(
        `Discord remained rate limited after ${maxAttempts} attempts: ${body.slice(0, 250)}`,
      );
    }

    await sleep(retryMs);
  }

  throw new Error(
    "Discord request retry loop exited unexpectedly.",
  );
}

async function loadGuildRoles(
  botToken: string,
  guildId: string,
): Promise<DiscordGuildRole[]> {
  const response =
    await discordFetch(
      `${DISCORD_API}/guilds/${guildId}/roles`,
      botToken,
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Discord role lookup failed (${response.status}): ${body.slice(0, 250)}`,
    );
  }

  return (
    await response.json()
  ) as DiscordGuildRole[];
}

async function loadGuildMembersBulk(
  botToken: string,
  guildId: string,
): Promise<DiscordGuildMember[] | null> {
  const allMembers:
    DiscordGuildMember[] = [];

  let after:
    string | null = null;

  for (;;) {
    const suffix =
      after
        ? `&after=${encodeURIComponent(after)}`
        : "";

    const response =
      await discordFetch(
        `${DISCORD_API}/guilds/${guildId}/members?limit=1000${suffix}`,
        botToken,
      );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      return null;
    }

    if (!response.ok) {
      const body =
        await response.text();

      throw new Error(
        `Discord guild member list failed (${response.status}): ${body.slice(0, 250)}`,
      );
    }

    const page =
      (await response.json()) as
        DiscordGuildMember[];

    allMembers.push(...page);

    if (page.length < 1000) {
      break;
    }

    const lastId =
      page.at(-1)?.user?.id?.trim();

    if (!lastId) {
      break;
    }

    after = lastId;
  }

  return allMembers;
}

async function loadOneGuildMember(
  botToken: string,
  guildId: string,
  discordId: string,
): Promise<DiscordGuildMember | null> {
  const response =
    await discordFetch(
      `${DISCORD_API}/guilds/${guildId}/members/${discordId}`,
      botToken,
    );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Discord member lookup failed (${response.status}): ${body.slice(0, 250)}`,
    );
  }

  return (
    await response.json()
  ) as DiscordGuildMember;
}

async function loadMembersSequentially(
  websiteMembers: WebsiteMember[],
  botToken: string,
  guildId: string,
) {
  const byDiscordId =
    new Map<
      string,
      DiscordGuildMember
    >();

  /*
   * Deliberately sequential.
   * Active Check launch is a snapshot operation, not a latency-sensitive
   * slash-command response. This avoids bursting Discord's member route.
   */
  for (const member of websiteMembers) {
    const discordId =
      member.discord_id?.trim();

    if (!discordId) {
      continue;
    }

    const guildMember =
      await loadOneGuildMember(
        botToken,
        guildId,
        discordId,
      );

    if (guildMember) {
      byDiscordId.set(
        discordId,
        guildMember,
      );
    }
  }

  return byDiscordId;
}

function memberMapFromBulk(
  members: DiscordGuildMember[],
) {
  const byDiscordId =
    new Map<
      string,
      DiscordGuildMember
    >();

  for (const member of members) {
    const discordId =
      member.user?.id?.trim();

    if (!discordId) {
      continue;
    }

    byDiscordId.set(
      discordId,
      member,
    );
  }

  return byDiscordId;
}

async function loadCurrentOwnershipState() {
  const websiteResult =
    await supabaseAdmin
      .from("members")
      .select(
        "id, discord_id, discord_username, display_name",
      )
      .not(
        "discord_id",
        "is",
        null,
      );

  if (websiteResult.error) {
    throw websiteResult.error;
  }

  const websiteMembers =
    (websiteResult.data ?? []) as
      WebsiteMember[];

  const websiteByDiscordId =
    new Map(
      websiteMembers.map(
        (member) => [
          member.discord_id.trim(),
          member,
        ],
      ),
    );

  const botToken =
    process.env
      .DISCORD_BOT_TOKEN
      ?.trim();

  const guildId =
    process.env
      .DISCORD_GUILD_ID
      ?.trim() ||
    process.env
      .DISCORD_GOLD_JACKET_GUILD_ID
      ?.trim() ||
    process.env
      .DISCORD_SERVER_ID
      ?.trim();

  if (!botToken || !guildId) {
    throw new Error(
      "DISCORD_BOT_TOKEN or Discord guild ID is missing.",
    );
  }

  const guildRoles =
    await loadGuildRoles(
      botToken,
      guildId,
    );

  const roleNameById =
    new Map(
      guildRoles.map(
        (role) => [
          role.id,
          role.name,
        ],
      ),
    );

  /*
   * Destructive reconciliation requires the COMPLETE guild
   * member list. A linked-member fallback is not authoritative
   * enough to decide that a franchise is unclaimed.
   */
  const bulkMembers =
    await loadGuildMembersBulk(
      botToken,
      guildId,
    );

  if (!bulkMembers) {
    throw new Error(
      "Active Check ownership refresh requires the complete Discord guild member list. Existing targets were preserved.",
    );
  }

  const candidates:
    ActiveCheckOwnerCandidate[] =
      [];

  for (
    const guildMember of
    bulkMembers
  ) {
    const discordId =
      guildMember
        .user
        ?.id
        ?.trim();

    if (
      !discordId ||
      guildMember
        .user
        ?.bot
    ) {
      continue;
    }

    const roleNames =
      (guildMember.roles ?? [])
        .map(
          (roleId) =>
            roleNameById.get(
              roleId,
            ),
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        );

    const teamMatches =
      findTeamsFromDiscordRoleNames(
        roleNames,
      );

    if (
      teamMatches.length === 0
    ) {
      continue;
    }

    const websiteMember =
      websiteByDiscordId.get(
        discordId,
      );

    candidates.push({
      discordId,

      displayName:
        websiteMember
          ?.display_name ||
        guildMember.nick ||
        guildMember
          .user
          ?.global_name ||
        websiteMember
          ?.discord_username ||
        guildMember
          .user
          ?.username ||
        discordId,

      memberId:
        websiteMember?.id ??
        null,

      teamSlugs:
        teamMatches.map(
          (team) =>
            team.slug,
        ),
    });
  }

  const resolution =
    resolveTeamCentricEligibility({
      teams:
        NFL_TEAMS.map(
          (team) => ({
            slug:
              team.slug,

            abbreviation:
              team.abbreviation,

            name:
              `${team.city} ${team.name}`,
          }),
        ),

      candidates,
    });

  return {
    ...resolution,
    authoritative:
      true as const,
  };
}

export async function buildActiveCheckTargetSnapshot():
  Promise<StrictActiveCheckTarget[]> {
  const state =
    await loadCurrentOwnershipState();

  if (
    state
      .ambiguousDiscordIds
      .length > 0
  ) {
    console.warn(
      "Active Check ignored Discord users with multiple DIFFERENT NFL team roles:",
      state.ambiguousDiscordIds,
    );
  }

  return state.targets;
}

export async function reconcileActiveCheckTargets(
  activeCheckId: string,
) {
  const normalizedCheckId =
    activeCheckId.trim();

  if (!normalizedCheckId) {
    throw new Error(
      "Active Check ID is required for reconciliation.",
    );
  }

  // Discord is loaded BEFORE any database mutation.
  const liveState =
    await loadCurrentOwnershipState();

  const [
    targetResult,
    clicksResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from(
          "active_check_targets",
        )
        .select(
          "team_slug,team_abbreviation,team_name,member_id,discord_id,display_name",
        )
        .eq(
          "active_check_id",
          normalizedCheckId,
        ),

      supabaseAdmin
        .from(
          "active_check_clicks",
        )
        .select(
          "team_slug,discord_id",
        )
        .eq(
          "active_check_id",
          normalizedCheckId,
        ),
    ]);

  if (targetResult.error) {
    throw targetResult.error;
  }

  if (clicksResult.error) {
    throw clicksResult.error;
  }

  const existingTargets =
    (targetResult.data ?? [])
      .map(
        (row) => ({
          teamSlug:
            row.team_slug,
          teamAbbreviation:
            row.team_abbreviation,
          teamName:
            row.team_name,
          memberId:
            row.member_id,
          discordId:
            row.discord_id,
          displayName:
            row.display_name ||
            row.discord_id,
        }),
      );

  const clicks =
    (clicksResult.data ?? [])
      .map(
        (row) => ({
          teamSlug:
            row.team_slug,
          discordId:
            row.discord_id,
        }),
      );

  const plan =
    planTeamCentricReconciliation({
      existingTargets,
      liveTargets:
        liveState.targets,
      clicks,
    });

  /*
   * First add/update CURRENT eligibility. The new composite
   * index allows same-team multiple holders. Upsert-first
   * prevents a failed insert from wiping the registry.
   */
  if (
    liveState.targets.length > 0
  ) {
    const upsertResult =
      await supabaseAdmin
        .from(
          "active_check_targets",
        )
        .upsert(
          liveState.targets.map(
            (target) => ({
              active_check_id:
                normalizedCheckId,
              team_slug:
                target.teamSlug,
              team_abbreviation:
                target.teamAbbreviation,
              team_name:
                target.teamName,
              member_id:
                target.memberId,
              discord_id:
                target.discordId,
              display_name:
                target.displayName,
            }),
          ),
          {
            onConflict:
              "active_check_id,team_slug,discord_id",
          },
        );

    if (upsertResult.error) {
      throw upsertResult.error;
    }
  }

  /* Remove only eligibility rows that are no longer live. */
  for (
    const stale of
    plan.targetKeysToDelete
  ) {
    const deleteResult =
      await supabaseAdmin
        .from(
          "active_check_targets",
        )
        .delete()
        .eq(
          "active_check_id",
          normalizedCheckId,
        )
        .eq(
          "team_slug",
          stale.teamSlug,
        )
        .eq(
          "discord_id",
          stale.discordId,
        );

    if (deleteResult.error) {
      throw deleteResult.error;
    }
  }

  /*
   * Preserve a valid team response across main-owner/sub churn.
   * Clear it only if the TEAM becomes fully unclaimed.
   */
  if (
    plan
      .clickTeamSlugsToDelete
      .length > 0
  ) {
    const deleteClicksResult =
      await supabaseAdmin
        .from(
          "active_check_clicks",
        )
        .delete()
        .eq(
          "active_check_id",
          normalizedCheckId,
        )
        .in(
          "team_slug",
          plan
            .clickTeamSlugsToDelete,
        );

    if (deleteClicksResult.error) {
      throw deleteClicksResult.error;
    }
  }

  return {
    activeCheckId:
      normalizedCheckId,

    liveEligibilityRows:
      liveState.targets.length,

    distinctClaimedTeams:
      new Set(
        liveState.targets.map(
          (target) =>
            target.teamSlug,
        ),
      ).size,

    ambiguousDiscordIds:
      liveState.ambiguousDiscordIds,

    removedEligibilityRows:
      plan.targetKeysToDelete,

    clearedTeamClicks:
      plan.clickTeamSlugsToDelete,

    preservedClaimedTeams:
      plan.unchangedTeamSlugs,
  };
}
