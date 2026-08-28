import { supabaseAdmin } from "@/lib/supabase-admin";

const DISCORD_API = "https://discord.com/api/v10";

export type ActiveCheckReminderKey =
  | "six_hour"
  | "two_hour"
  | "final_30m"
  | "closed";

type ActiveCheckRow = {
  active_check_id: string;
  channel_id: string | null;
  check_type: "league" | "weekly" | "waitlist" | "unknown";
  title: string | null;
  started_at: string;
  closes_at: string | null;
  status: "open" | "closed";
  closed_at: string | null;
  show_timer: boolean;
  reminder_6h: boolean;
  reminder_2h: boolean;
  reminder_30m: boolean;
  final_dm: boolean;
};

type TeamRow = {
  id: string;
  abbreviation: string;
  owner_member_id: string | null;
};

type MemberRow = {
  id: string;
  discord_id: string | null;
  display_name: string;
};

type ClickRow = {
  discord_id: string | null;
};

type MissingOwner = {
  teamId: string;
  teamAbbreviation: string;
  memberId: string;
  discordId: string;
  displayName: string;
};

type DiscordMessage = {
  id: string;
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: { text?: string; icon_url?: string };
    timestamp?: string;
    thumbnail?: { url?: string };
    image?: { url?: string };
    author?: { name?: string; url?: string; icon_url?: string };
  }>;
  components?: Array<{
    type: number;
    components?: Array<Record<string, unknown>>;
  }>;
};

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function discordRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();

  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured.");
  }

  const request = async () =>
    fetch(`${DISCORD_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

  let response = await request();

  if (response.status === 429) {
    const rateLimit = (await response.json().catch(() => ({}))) as {
      retry_after?: number;
    };

    await sleep(
      Math.min(5_000, Math.max(250, Number(rateLimit.retry_after ?? 1) * 1_000)),
    );
    response = await request();
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `Discord ${response.status}: ${JSON.stringify(payload).slice(0, 800)}`,
    );
  }

  return payload as T;
}

function resolveChannelId(check: ActiveCheckRow | { channel_id: string | null }) {
  return (
    check.channel_id?.trim() ||
    process.env.DISCORD_ACTIVE_CHECK_CHANNEL_ID?.trim() ||
    null
  );
}

function unixTimestamp(iso: string) {
  return Math.floor(new Date(iso).getTime() / 1_000);
}

function timerField(closesAt: string) {
  const timestamp = unixTimestamp(closesAt);

  return {
    name: "⏱️ Active Check Closes",
    value: `<t:${timestamp}:F> • <t:${timestamp}:R>`,
    inline: false,
  };
}

export async function setDiscordActiveCheckTimerField(options: {
  activeCheckId: string;
  channelId: string | null;
  closesAt: string;
  showTimer: boolean;
}) {
  const channelId =
    options.channelId?.trim() ||
    process.env.DISCORD_ACTIVE_CHECK_CHANNEL_ID?.trim();

  if (!channelId) {
    throw new Error("DISCORD_ACTIVE_CHECK_CHANNEL_ID is not configured.");
  }

  const message = await discordRequest<DiscordMessage>(
    `/channels/${channelId}/messages/${options.activeCheckId}`,
  );

  const embed = message.embeds?.[0];

  if (!embed) {
    throw new Error("The current active-check Discord message has no embed.");
  }

  const fields = (embed.fields ?? []).filter(
    (field) => field.name !== "⏱️ Active Check Closes",
  );

  if (options.showTimer) {
    fields.push(timerField(options.closesAt));
  }

  await discordRequest<DiscordMessage>(
    `/channels/${channelId}/messages/${options.activeCheckId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        embeds: [
          {
            ...embed,
            fields,
          },
        ],
      }),
    },
  );
}

export async function disableDiscordActiveCheckButton(check: ActiveCheckRow) {
  const channelId = resolveChannelId(check);

  if (!channelId) {
    throw new Error("Active-check channel ID is unavailable.");
  }

  const message = await discordRequest<DiscordMessage>(
    `/channels/${channelId}/messages/${check.active_check_id}`,
  );

  const components = (message.components ?? []).map((row) => ({
    ...row,
    components: (row.components ?? []).map((component) => {
      if (component.custom_id === "active_check_join") {
        return {
          ...component,
          disabled: true,
          label: "Check Closed",
        };
      }

      return component;
    }),
  }));

  await discordRequest<DiscordMessage>(
    `/channels/${channelId}/messages/${check.active_check_id}`,
    {
      method: "PATCH",
      body: JSON.stringify({ components }),
    },
  );
}

async function getMissingOwners(activeCheckId: string): Promise<MissingOwner[]> {
  const leagueResult = await supabaseAdmin
    .from("leagues")
    .select("id")
    .eq("slug", "gold-jacket-cfm")
    .maybeSingle();

  if (leagueResult.error) throw leagueResult.error;
  if (!leagueResult.data?.id) return [];

  const teamsResult = await supabaseAdmin
    .from("teams")
    .select("id, abbreviation, owner_member_id")
    .eq("league_id", leagueResult.data.id)
    .not("owner_member_id", "is", null);

  if (teamsResult.error) throw teamsResult.error;

  const teams = (teamsResult.data ?? []) as TeamRow[];
  const memberIds = teams
    .map((team) => team.owner_member_id)
    .filter((value): value is string => Boolean(value));

  if (memberIds.length === 0) return [];

  const [membersResult, clicksResult] = await Promise.all([
    supabaseAdmin
      .from("members")
      .select("id, discord_id, display_name")
      .in("id", memberIds),
    supabaseAdmin
      .from("active_check_clicks")
      .select("discord_id")
      .eq("active_check_id", activeCheckId)
      .not("discord_id", "is", null),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (clicksResult.error) throw clicksResult.error;

  const members = (membersResult.data ?? []) as MemberRow[];
  const clicks = (clicksResult.data ?? []) as ClickRow[];
  const checkedDiscordIds = new Set(
    clicks
      .map((click) => click.discord_id)
      .filter((value): value is string => Boolean(value)),
  );
  const memberById = new Map(members.map((member) => [member.id, member]));

  return teams
    .map((team) => {
      const member = team.owner_member_id
        ? memberById.get(team.owner_member_id)
        : null;

      if (!member?.discord_id || checkedDiscordIds.has(member.discord_id)) {
        return null;
      }

      return {
        teamId: team.id,
        teamAbbreviation: team.abbreviation,
        memberId: member.id,
        discordId: member.discord_id,
        displayName: member.display_name,
      } satisfies MissingOwner;
    })
    .filter((owner): owner is MissingOwner => Boolean(owner));
}

async function reminderAlreadyRecorded(
  activeCheckId: string,
  reminderKey: ActiveCheckReminderKey,
) {
  const result = await supabaseAdmin
    .from("active_check_reminder_events")
    .select("id")
    .eq("active_check_id", activeCheckId)
    .eq("reminder_key", reminderKey)
    .maybeSingle();

  if (result.error) throw result.error;
  return Boolean(result.data);
}

async function recordReminderEvent(options: {
  activeCheckId: string;
  reminderKey: ActiveCheckReminderKey;
  missingOwners: MissingOwner[];
  channelMessageId?: string | null;
  dmSuccessCount?: number;
  dmFailureCount?: number;
  details?: Record<string, unknown>;
}) {
  const result = await supabaseAdmin
    .from("active_check_reminder_events")
    .upsert(
      {
        active_check_id: options.activeCheckId,
        reminder_key: options.reminderKey,
        recipient_count: options.missingOwners.length,
        recipient_discord_ids: options.missingOwners.map(
          (owner) => owner.discordId,
        ),
        channel_message_id: options.channelMessageId ?? null,
        dm_success_count: options.dmSuccessCount ?? 0,
        dm_failure_count: options.dmFailureCount ?? 0,
        details: options.details ?? {},
        sent_at: new Date().toISOString(),
      },
      { onConflict: "active_check_id,reminder_key" },
    );

  if (result.error) throw result.error;
}

function reminderCopy(
  key: Exclude<ActiveCheckReminderKey, "closed">,
  missingCount: number,
) {
  if (key === "six_hour") {
    return `⚠️ **ACTIVE CHECK REMINDER**\n\nThe current GOLD JACKET Active Check closes in about **6 hours**.\n\n**Still missing (${missingCount}):**`;
  }

  if (key === "two_hour") {
    return `🚨 **ACTIVE CHECK WARNING**\n\nThe current GOLD JACKET Active Check closes in about **2 hours**.\n\n**Still missing (${missingCount}):**`;
  }

  return `🚨 **FINAL ACTIVE CHECK WARNING**\n\nThe current GOLD JACKET Active Check closes in about **30 minutes**. Failure to check in will be recorded.\n\n**Still missing (${missingCount}):**`;
}

async function postMissingOwnerReminder(options: {
  check: ActiveCheckRow;
  key: Exclude<ActiveCheckReminderKey, "closed">;
  missingOwners: MissingOwner[];
}) {
  const channelId = resolveChannelId(options.check);

  if (!channelId) {
    throw new Error("Active-check channel ID is unavailable.");
  }

  if (options.missingOwners.length === 0) {
    return null;
  }

  const ids = options.missingOwners.map((owner) => owner.discordId);
  const mentions = ids.map((id) => `<@${id}>`).join(" ");

  const response = await discordRequest<{ id: string }>(
    `/channels/${channelId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content: `${reminderCopy(options.key, ids.length)}\n${mentions}\n\nHit **I'm Active** on the current check before it closes.`,
        allowed_mentions: {
          parse: [],
          users: ids,
        },
      }),
    },
  );

  return response.id;
}

async function sendFinalDm(owner: MissingOwner) {
  const dmChannel = await discordRequest<{ id: string }>(
    "/users/@me/channels",
    {
      method: "POST",
      body: JSON.stringify({ recipient_id: owner.discordId }),
    },
  );

  await discordRequest(
    `/channels/${dmChannel.id}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content:
          "🚨 **GOLD JACKET — FINAL ACTIVE CHECK WARNING**\n\nYou still have not completed the current Active Check. Please hit **I'm Active** in the server now. The check closes in about **30 minutes**, and a miss will be recorded if you do not respond.",
      }),
    },
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, items.length)) },
      () => worker(),
    ),
  );

  return results;
}

async function closeCheck(check: ActiveCheckRow, missingOwners: MissingOwner[]) {
  const alreadyClosed = await reminderAlreadyRecorded(
    check.active_check_id,
    "closed",
  );

  if (alreadyClosed) return;

  if (missingOwners.length > 0) {
    const misses = missingOwners.map((owner) => ({
      active_check_id: check.active_check_id,
      team_id: owner.teamId,
      team_abbreviation: owner.teamAbbreviation,
      member_id: owner.memberId,
      discord_id: owner.discordId,
      recorded_at: new Date().toISOString(),
    }));

    const missResult = await supabaseAdmin
      .from("active_check_misses")
      .upsert(misses, { onConflict: "active_check_id,team_id" });

    if (missResult.error) throw missResult.error;
  }

  const closedAt = new Date().toISOString();
  const updateResult = await supabaseAdmin
    .from("league_health_active_checks")
    .update({
      status: "closed",
      closed_at: closedAt,
    })
    .eq("active_check_id", check.active_check_id);

  if (updateResult.error) throw updateResult.error;

  let disableError: string | null = null;

  try {
    await disableDiscordActiveCheckButton(check);
  } catch (error) {
    disableError = error instanceof Error ? error.message : String(error);
  }

  await recordReminderEvent({
    activeCheckId: check.active_check_id,
    reminderKey: "closed",
    missingOwners,
    details: disableError ? { disableError } : {},
  });
}

async function processOneCheck(check: ActiveCheckRow) {
  if (!check.closes_at || check.status !== "open") {
    return { activeCheckId: check.active_check_id, action: "skipped" };
  }

  const closesAt = new Date(check.closes_at).getTime();
  const millisecondsRemaining = closesAt - Date.now();
  const minutesRemaining = millisecondsRemaining / (60 * 1_000);
  const missingOwners =
    check.check_type === "waitlist"
      ? []
      : await getMissingOwners(check.active_check_id);

  if (minutesRemaining <= 0) {
    await closeCheck(check, missingOwners);
    return {
      activeCheckId: check.active_check_id,
      action: "closed",
      missing: missingOwners.length,
    };
  }

  let key: Exclude<ActiveCheckReminderKey, "closed"> | null = null;

  if (minutesRemaining <= 30 && check.reminder_30m) {
    key = "final_30m";
  } else if (minutesRemaining <= 120 && check.reminder_2h) {
    key = "two_hour";
  } else if (minutesRemaining <= 360 && check.reminder_6h) {
    key = "six_hour";
  }

  if (!key || check.check_type === "waitlist") {
    return {
      activeCheckId: check.active_check_id,
      action: "waiting",
      minutesRemaining: Math.max(0, Math.round(minutesRemaining)),
      missing: missingOwners.length,
    };
  }

  if (await reminderAlreadyRecorded(check.active_check_id, key)) {
    return {
      activeCheckId: check.active_check_id,
      action: "already_sent",
      reminder: key,
      missing: missingOwners.length,
    };
  }

  const channelMessageId = await postMissingOwnerReminder({
    check,
    key,
    missingOwners,
  });

  let dmSuccessCount = 0;
  let dmFailureCount = 0;
  const dmErrors: Array<{ discordId: string; error: string }> = [];

  if (key === "final_30m" && check.final_dm && missingOwners.length > 0) {
    const dmResults = await mapWithConcurrency(
      missingOwners,
      4,
      async (owner) => {
        try {
          await sendFinalDm(owner);
          return { success: true, owner, error: null };
        } catch (error) {
          return {
            success: false,
            owner,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    );

    for (const result of dmResults) {
      if (result.success) {
        dmSuccessCount += 1;
      } else {
        dmFailureCount += 1;
        dmErrors.push({
          discordId: result.owner.discordId,
          error: result.error ?? "Unknown DM error",
        });
      }
    }
  }

  await recordReminderEvent({
    activeCheckId: check.active_check_id,
    reminderKey: key,
    missingOwners,
    channelMessageId,
    dmSuccessCount,
    dmFailureCount,
    details: dmErrors.length > 0 ? { dmErrors } : {},
  });

  return {
    activeCheckId: check.active_check_id,
    action: missingOwners.length > 0 ? "sent" : "no_missing_owners",
    reminder: key,
    missing: missingOwners.length,
    dmSuccessCount,
    dmFailureCount,
  };
}

export async function processActiveCheckReminders() {
  const result = await supabaseAdmin
    .from("league_health_active_checks")
    .select(
      "active_check_id, channel_id, check_type, title, started_at, closes_at, status, closed_at, show_timer, reminder_6h, reminder_2h, reminder_30m, final_dm",
    )
    .eq("status", "open")
    .not("closes_at", "is", null)
    .order("closes_at", { ascending: true });

  if (result.error) throw result.error;

  const checks = (result.data ?? []) as ActiveCheckRow[];
  const outcomes = [];

  for (const check of checks) {
    outcomes.push(await processOneCheck(check));
  }

  return {
    processed: checks.length,
    outcomes,
    completedAt: new Date().toISOString(),
  };
}

export async function getActiveCheckTimerStatus() {
  const checkResult = await supabaseAdmin
    .from("league_health_active_checks")
    .select(
      "active_check_id, channel_id, check_type, title, started_at, closes_at, status, closed_at, show_timer, reminder_6h, reminder_2h, reminder_30m, final_dm",
    )
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (checkResult.error) throw checkResult.error;

  const check = (checkResult.data ?? null) as ActiveCheckRow | null;

  if (!check) {
    return {
      check: null,
      ownerCount: 0,
      checkedCount: 0,
      missingCount: 0,
    };
  }

  const leagueResult = await supabaseAdmin
    .from("leagues")
    .select("id")
    .eq("slug", "gold-jacket-cfm")
    .maybeSingle();

  if (leagueResult.error) throw leagueResult.error;

  let ownerCount = 0;

  if (leagueResult.data?.id) {
    const countResult = await supabaseAdmin
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("league_id", leagueResult.data.id)
      .not("owner_member_id", "is", null);

    if (countResult.error) throw countResult.error;
    ownerCount = countResult.count ?? 0;
  }

  const clicksResult = await supabaseAdmin
    .from("active_check_clicks")
    .select("discord_id")
    .eq("active_check_id", check.active_check_id)
    .not("discord_id", "is", null);

  if (clicksResult.error) throw clicksResult.error;

  const checkedCount = new Set(
    ((clicksResult.data ?? []) as ClickRow[])
      .map((row) => row.discord_id)
      .filter(Boolean),
  ).size;

  return {
    check,
    ownerCount,
    checkedCount,
    missingCount: Math.max(0, ownerCount - checkedCount),
  };
}
