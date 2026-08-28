import { NFL_TEAMS } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

type LeagueRow = {
  id: string;
  name: string | null;
  season: number | null;
  current_week: number | null;
};

type TeamRow = {
  id: string;
  city: string | null;
  name: string;
  abbreviation: string;
  owner_member_id: string | null;
};

type MemberRow = {
  id: string;
  discord_id: string | null;
  discord_username: string | null;
  display_name: string;
  is_active: boolean;
  last_seen_at: string | null;
};

type GameRow = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_abbreviation: string | null;
  away_team_abbreviation: string | null;
  scheduled_at: string | null;
  status: "scheduled" | "in_progress" | "final" | "cancelled";
  home_score: number | null;
  away_score: number | null;
};

type DiscordSummaryRow = {
  discord_id: string;
  messages_7d: number | string;
  messages_30d: number | string;
  last_message_at: string | null;
};

type ActiveCheckRow = {
  active_check_id: string;
  check_type: "league" | "weekly" | "waitlist" | "unknown";
  title: string | null;
  started_at: string;
};

type CheckClickRow = {
  active_check_id: string;
  discord_id: string | null;
  team_slug: string | null;
  checked_in_at: string;
};

type SyncStateRow = {
  last_started_at: string | null;
  last_completed_at: string | null;
  last_error: string | null;
  channels_scanned: number;
  messages_seen: number;
  messages_saved: number;
};

type HealthComponent = {
  key: "owner" | "games" | "discord" | "activeChecks";
  label: string;
  score: number;
  weight: number;
};

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function weightedScore(components: HealthComponent[]) {
  if (components.length === 0) return 0;

  const totalWeight = components.reduce(
    (total, component) => total + component.weight,
    0,
  );

  if (totalWeight === 0) return 0;

  return Math.round(
    components.reduce(
      (total, component) =>
        total + component.score * component.weight,
      0,
    ) / totalWeight,
  );
}

function healthLabel(score: number) {
  if (score >= 80) return "healthy";
  if (score >= 60) return "watch";
  return "critical";
}

function hoursSince(value: string | null) {
  if (!value) return null;

  return Math.max(
    0,
    (Date.now() - new Date(value).getTime()) / (60 * 60 * 1_000),
  );
}

function normalizeSlug(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function teamSlug(team: TeamRow) {
  const known = NFL_TEAMS.find(
    (entry) =>
      entry.abbreviation.toUpperCase() ===
      team.abbreviation.toUpperCase(),
  );

  return known?.slug ?? normalizeSlug(team.name);
}

function gameScore(game: GameRow | null) {
  if (!game) return null;

  if (game.status === "final") return 100;
  if (game.status === "in_progress") return 75;
  if (game.status === "cancelled") return null;

  const overdue =
    game.scheduled_at &&
    new Date(game.scheduled_at).getTime() < Date.now();

  return overdue ? 25 : 70;
}

function discordScore(
  messages7d: number,
  lastMessageAt: string | null,
) {
  if (messages7d >= 5) return 100;
  if (messages7d >= 2) return 85;
  if (messages7d === 1) return 65;

  const ageHours = hoursSince(lastMessageAt);

  if (ageHours !== null && ageHours <= 14 * 24) {
    return 30;
  }

  return 0;
}

function relationStatus(
  game: GameRow | null,
) {
  if (!game) return "no_schedule";
  return game.status;
}

export async function buildLeagueHealthReport() {
  const leagueResult = await supabaseAdmin
    .from("leagues")
    .select("id, name, season, current_week")
    .eq("slug", "gold-jacket-cfm")
    .maybeSingle();

  if (leagueResult.error) throw leagueResult.error;

  if (!leagueResult.data) {
    throw new Error("GOLD JACKET league record was not found.");
  }

  const league = leagueResult.data as LeagueRow;
  const season = Number(league.season ?? 1);
  const currentWeek = Number(league.current_week ?? 1);

  const [
    teamsResult,
    gamesResult,
    discordResult,
    checksResult,
    syncStateResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("teams")
      .select(
        "id, city, name, abbreviation, owner_member_id",
      )
      .eq("league_id", league.id)
      .order("city", { ascending: true }),

    supabaseAdmin
      .from("league_games")
      .select(
        "id, home_team_id, away_team_id, home_team_abbreviation, away_team_abbreviation, scheduled_at, status, home_score, away_score",
      )
      .eq("league_id", league.id)
      .eq("season", season)
      .eq("week", currentWeek),

    supabaseAdmin.rpc(
      "get_league_health_discord_summary",
    ),

    supabaseAdmin
      .from("league_health_active_checks")
      .select(
        "active_check_id, check_type, title, started_at",
      )
      .neq("check_type", "waitlist")
      .order("started_at", { ascending: false })
      .limit(5),

    supabaseAdmin
      .from("league_health_sync_state")
      .select(
        "last_started_at, last_completed_at, last_error, channels_scanned, messages_seen, messages_saved",
      )
      .eq("id", "discord")
      .maybeSingle(),
  ]);

  const errors = [
    teamsResult.error,
    gamesResult.error,
    discordResult.error,
    checksResult.error,
    syncStateResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  const teams = (teamsResult.data ?? []) as TeamRow[];
  const games = (gamesResult.data ?? []) as GameRow[];
  const discordRows =
    (discordResult.data ?? []) as DiscordSummaryRow[];
  const checks = (checksResult.data ?? []) as ActiveCheckRow[];
  const syncState =
    (syncStateResult.data ?? null) as SyncStateRow | null;

  const ownerIds = teams
    .map((team) => team.owner_member_id)
    .filter((id): id is string => Boolean(id));

  const membersResult =
    ownerIds.length > 0
      ? await supabaseAdmin
          .from("members")
          .select(
            "id, discord_id, discord_username, display_name, is_active, last_seen_at",
          )
          .in("id", ownerIds)
      : { data: [], error: null };

  if (membersResult.error) throw membersResult.error;

  const members = (membersResult.data ?? []) as MemberRow[];
  const memberById = new Map(
    members.map((member) => [member.id, member]),
  );

  const discordById = new Map(
    discordRows.map((row) => [
      row.discord_id,
      {
        messages7d: Number(row.messages_7d ?? 0),
        messages30d: Number(row.messages_30d ?? 0),
        lastMessageAt: row.last_message_at,
      },
    ]),
  );

  const checkIds = checks.map((check) => check.active_check_id);

  const [liveClicksResult, archivedClicksResult] =
    checkIds.length > 0
      ? await Promise.all([
          supabaseAdmin
            .from("active_check_clicks")
            .select(
              "active_check_id, discord_id, team_slug, checked_in_at",
            )
            .in("active_check_id", checkIds),
          supabaseAdmin
            .from("active_check_click_archive")
            .select(
              "active_check_id, discord_id, team_slug, checked_in_at",
            )
            .in("active_check_id", checkIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (liveClicksResult.error) throw liveClicksResult.error;
  if (archivedClicksResult.error) {
    throw archivedClicksResult.error;
  }

  const clicks = [
    ...((liveClicksResult.data ?? []) as CheckClickRow[]),
    ...((archivedClicksResult.data ?? []) as CheckClickRow[]),
  ];

  const clickKeys = new Set<string>();

  for (const click of clicks) {
    if (click.team_slug) {
      clickKeys.add(
        `${click.active_check_id}:team:${normalizeSlug(
          click.team_slug,
        )}`,
      );
    }

    if (click.discord_id) {
      clickKeys.add(
        `${click.active_check_id}:user:${click.discord_id}`,
      );
    }
  }

  const gameByTeamId = new Map<string, GameRow>();

  for (const game of games) {
    if (game.home_team_id) {
      gameByTeamId.set(game.home_team_id, game);
    }

    if (game.away_team_id) {
      gameByTeamId.set(game.away_team_id, game);
    }
  }

  const discordAvailable = Boolean(
    syncState?.last_completed_at,
  );
  const activeChecksAvailable = checks.length > 0;
  const scheduleAvailable = games.length > 0;

  const latestCheck = checks[0] ?? null;
  const latestCheckAgeHours = hoursSince(
    latestCheck?.started_at ?? null,
  );

  const teamReports = teams.map((team) => {
    const owner = team.owner_member_id
      ? memberById.get(team.owner_member_id) ?? null
      : null;

    const discordActivity = owner?.discord_id
      ? discordById.get(owner.discord_id) ?? {
          messages7d: 0,
          messages30d: 0,
          lastMessageAt: null,
        }
      : {
          messages7d: 0,
          messages30d: 0,
          lastMessageAt: null,
        };

    const slug = teamSlug(team);
    const game = gameByTeamId.get(team.id) ?? null;
    const components: HealthComponent[] = [];
    const attention: string[] = [];

    components.push({
      key: "owner",
      label: "Owner connected",
      score: owner ? 100 : 0,
      weight: 10,
    });

    if (!owner) {
      attention.push("No connected team owner");
    }

    const currentGameScore = gameScore(game);

    if (currentGameScore !== null) {
      components.push({
        key: "games",
        label: "Current-week game",
        score: currentGameScore,
        weight: 35,
      });
    }

    const gameOverdue =
      game?.status === "scheduled" &&
      game.scheduled_at &&
      new Date(game.scheduled_at).getTime() < Date.now();

    if (gameOverdue) {
      attention.push("Current-week game is overdue");
    }

    if (owner && discordAvailable) {
      const score = discordScore(
        discordActivity.messages7d,
        discordActivity.lastMessageAt,
      );

      components.push({
        key: "discord",
        label: "Discord activity",
        score,
        weight: 35,
      });

      if (discordActivity.messages7d === 0) {
        attention.push("No Discord messages in 7 days");
      }
    }

    const checkResults = checks.map((check) => {
      const hit =
        clickKeys.has(
          `${check.active_check_id}:team:${slug}`,
        ) ||
        Boolean(
          owner?.discord_id &&
            clickKeys.has(
              `${check.active_check_id}:user:${owner.discord_id}`,
            ),
        );

      return {
        id: check.active_check_id,
        hit,
      };
    });

    const checkHits = checkResults.filter(
      (result) => result.hit,
    ).length;
    const checkMisses = checkResults.length - checkHits;
    const latestCheckHit =
      latestCheck && checkResults.length > 0
        ? checkResults[0].hit
        : null;

    if (owner && activeChecksAvailable) {
      components.push({
        key: "activeChecks",
        label: "Active-check history",
        score: Math.round(
          (checkHits / Math.max(1, checkResults.length)) * 100,
        ),
        weight: 20,
      });

      const latestMissNeedsAttention =
        latestCheckHit === false &&
        latestCheckAgeHours !== null &&
        latestCheckAgeHours >= 12;

      const previousMisses =
        checkResults.slice(1).filter((result) => !result.hit)
          .length;

      if (latestMissNeedsAttention) {
        attention.push("Latest active check missed");
      } else if (previousMisses > 0) {
        attention.push(
          `${previousMisses} recent active check${
            previousMisses === 1 ? "" : "s"
          } missed`,
        );
      }
    }

    const score = weightedScore(components);

    return {
      team: {
        id: team.id,
        slug,
        city: team.city,
        name: team.name,
        abbreviation: team.abbreviation,
      },
      owner: owner
        ? {
            id: owner.id,
            discordId: owner.discord_id,
            username: owner.discord_username,
            displayName: owner.display_name,
            websiteActive: owner.is_active,
            lastWebsiteSeenAt: owner.last_seen_at,
          }
        : null,
      game: game
        ? {
            id: game.id,
            status: relationStatus(game),
            scheduledAt: game.scheduled_at,
            homeScore: game.home_score,
            awayScore: game.away_score,
            opponentAbbreviation:
              game.home_team_id === team.id
                ? game.away_team_abbreviation
                : game.home_team_abbreviation,
            overdue: Boolean(gameOverdue),
          }
        : null,
      discord: {
        available: discordAvailable,
        messages7d: discordActivity.messages7d,
        messages30d: discordActivity.messages30d,
        lastMessageAt: discordActivity.lastMessageAt,
      },
      activeChecks: {
        available: activeChecksAvailable,
        total: checkResults.length,
        hits: checkHits,
        misses: checkMisses,
        latest:
          latestCheckHit === null
            ? "no_data"
            : latestCheckHit
              ? "hit"
              : "missed",
      },
      components,
      score: clamp(score),
      status: healthLabel(score),
      attention,
    };
  });

  teamReports.sort((left, right) => {
    if (left.attention.length !== right.attention.length) {
      return right.attention.length - left.attention.length;
    }

    return left.score - right.score;
  });

  const assignedOwners = teamReports.filter(
    (team) => team.owner,
  ).length;
  const discordActiveOwners = teamReports.filter(
    (team) =>
      team.owner &&
      team.discord.available &&
      team.discord.messages7d > 0,
  ).length;
  const completedGames = games.filter(
    (game) => game.status === "final",
  ).length;
  const latestCheckHits = latestCheck
    ? teamReports.filter(
        (team) =>
          team.owner && team.activeChecks.latest === "hit",
      ).length
    : 0;

  const scores = teamReports.map((team) => team.score);
  const overallScore =
    scores.length > 0
      ? Math.round(
          scores.reduce((total, score) => total + score, 0) /
            scores.length,
        )
      : 0;

  const lastDiscordSync = syncState?.last_completed_at ?? null;
  const shouldSync =
    !lastDiscordSync ||
    Date.now() - new Date(lastDiscordSync).getTime() >
      60 * 60 * 1_000;

  return {
    generatedAt: new Date().toISOString(),
    league: {
      id: league.id,
      name: league.name ?? "GOLD JACKET CFM",
      season,
      currentWeek,
    },
    overall: {
      score: overallScore,
      status: healthLabel(overallScore),
      teamsTracked: teams.length,
      attentionCount: teamReports.filter(
        (team) => team.attention.length > 0,
      ).length,
    },
    metrics: {
      owners: {
        assigned: assignedOwners,
        total: teams.length,
      },
      games: {
        available: scheduleAvailable,
        completed: completedGames,
        total: games.length,
        pending: games.filter(
          (game) =>
            game.status === "scheduled" ||
            game.status === "in_progress",
        ).length,
      },
      discord: {
        available: discordAvailable,
        activeOwners: discordActiveOwners,
        assignedOwners,
      },
      activeChecks: {
        available: activeChecksAvailable,
        latestCheckId: latestCheck?.active_check_id ?? null,
        latestTitle: latestCheck?.title ?? null,
        latestStartedAt: latestCheck?.started_at ?? null,
        hits: latestCheckHits,
        eligibleOwners: assignedOwners,
        checksTracked: checks.length,
      },
    },
    dataSources: {
      games: {
        ready: scheduleAvailable,
        label: scheduleAvailable
          ? `${games.length} current-week games loaded`
          : "Waiting for schedule data",
      },
      discord: {
        ready: discordAvailable,
        label: discordAvailable
          ? `Last synced ${lastDiscordSync}`
          : "Discord activity has not synced yet",
        lastCompletedAt: lastDiscordSync,
        lastError: syncState?.last_error ?? null,
        channelsScanned: Number(
          syncState?.channels_scanned ?? 0,
        ),
      },
      activeChecks: {
        ready: activeChecksAvailable,
        label: activeChecksAvailable
          ? `${checks.length} recent checks tracked`
          : "Waiting for an active check",
      },
    },
    shouldSync,
    teams: teamReports,
  };
}
