import { supabaseAdmin } from "@/lib/supabase-admin";
import { findTeamsFromDiscordRoleNames } from "@/lib/nfl-teams";
import { reconcileActiveCheckTargets } from "@/lib/active-check/targets";
import {
  finalWarningDue,
  recurringReminderDue,
  recurringReminderKey,
} from "./target-snapshot-core.mjs";

const DISCORD_API = "https://discord.com/api/v10";

export type ActiveCheckReminderKey =
  | "closed"
  | "final_warning"
  | `recurring_${string}`;

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
  teamId: string | null;
  teamSlug: string;
  teamAbbreviation: string;
  memberId: string | null;
  discordId: string;
  displayName: string;
};

type DiscordGuildRole = {
  id: string;
  name: string;
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

async function getMissingOwners(
  activeCheckId: string,
): Promise<MissingOwner[]> {
  const [
    targetsResult,
    clicksResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from(
          "active_check_targets",
        )
        .select(
          "team_slug,team_abbreviation,member_id,discord_id,display_name",
        )
        .eq(
          "active_check_id",
          activeCheckId,
        ),

      supabaseAdmin
        .from(
          "active_check_clicks",
        )
        .select(
          "team_slug",
        )
        .eq(
          "active_check_id",
          activeCheckId,
        ),
    ]);

  if (targetsResult.error) {
    throw targetsResult.error;
  }

  if (clicksResult.error) {
    throw clicksResult.error;
  }

  const checkedTeamSlugs =
    new Set(
      (clicksResult.data ?? [])
        .map(
          (click) =>
            click.team_slug,
        )
        .filter(Boolean),
    );

  /* One franchise = one requirement even with multiple holders. */
  const missingByTeam =
    new Map<
      string,
      MissingOwner
    >();

  for (
    const target of
    targetsResult.data ?? []
  ) {
    const teamSlug =
      target.team_slug;

    if (
      !teamSlug ||
      checkedTeamSlugs.has(
        teamSlug,
      ) ||
      missingByTeam.has(
        teamSlug,
      )
    ) {
      continue;
    }

    missingByTeam.set(
      teamSlug,
      {
        teamId:
          null,
        teamSlug,
        teamAbbreviation:
          target.team_abbreviation,
        memberId:
          target.member_id,
        discordId:
          target.discord_id,
        displayName:
          target.display_name ||
          target.discord_id,
      },
    );
  }

  return [
    ...missingByTeam.values(),
  ].sort(
    (a, b) =>
      a.teamAbbreviation.localeCompare(
        b.teamAbbreviation,
      ),
  );
}

async function reminderAlreadyRecorded(
  activeCheckId: string,
  reminderKey: ActiveCheckReminderKey,
) {
  const result =
    await supabaseAdmin
      .from(
        "active_check_reminder_events",
      )
      .select("id")
      .eq(
        "active_check_id",
        activeCheckId,
      )
      .eq(
        "reminder_key",
        reminderKey,
      )
      .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return Boolean(
    result.data,
  );
}

async function latestRecurringReminderSentAt(
  activeCheckId: string,
) {
  const result =
    await supabaseAdmin
      .from(
        "active_check_reminder_events",
      )
      .select(
        "sent_at",
      )
      .eq(
        "active_check_id",
        activeCheckId,
      )
      .like(
        "reminder_key",
        "recurring_%",
      )
      .order(
        "sent_at",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return (
    result.data?.sent_at ??
    null
  );
}

/*
 * Atomic reservation.
 *
 * The DB already has a unique constraint on
 * (active_check_id, reminder_key).
 *
 * Therefore two simultaneous cron invocations cannot both
 * obtain permission to send the same reminder.
 */
async function reserveReminderEvent(
  options: {
    activeCheckId: string;
    reminderKey:
      ActiveCheckReminderKey;
    missingOwners:
      MissingOwner[];
  },
) {
  const result =
    await supabaseAdmin
      .from(
        "active_check_reminder_events",
      )
      .insert({
        active_check_id:
          options.activeCheckId,

        reminder_key:
          options.reminderKey,

        recipient_count:
          options
            .missingOwners
            .length,

        recipient_discord_ids:
          options
            .missingOwners
            .map(
              (owner) =>
                owner.discordId,
            ),

        channel_message_id:
          null,

        dm_success_count:
          0,

        dm_failure_count:
          0,

        details: {
          status:
            "reserved",
        },

        sent_at:
          new Date()
            .toISOString(),
      });

  if (result.error) {
    if (
      result.error.code ===
      "23505"
    ) {
      return false;
    }

    throw result.error;
  }

  return true;
}

async function releaseReminderReservation(
  activeCheckId: string,
  reminderKey:
    ActiveCheckReminderKey,
) {
  const result =
    await supabaseAdmin
      .from(
        "active_check_reminder_events",
      )
      .delete()
      .eq(
        "active_check_id",
        activeCheckId,
      )
      .eq(
        "reminder_key",
        reminderKey,
      )
      .is(
        "channel_message_id",
        null,
      );

  if (result.error) {
    throw result.error;
  }
}

async function recordReminderEvent(
  options: {
    activeCheckId: string;
    reminderKey:
      ActiveCheckReminderKey;
    missingOwners:
      MissingOwner[];
    channelMessageId?:
      string | null;
    dmSuccessCount?: number;
    dmFailureCount?: number;
    details?:
      Record<string, unknown>;
  },
) {
  const result =
    await supabaseAdmin
      .from(
        "active_check_reminder_events",
      )
      .upsert(
        {
          active_check_id:
            options.activeCheckId,

          reminder_key:
            options.reminderKey,

          recipient_count:
            options
              .missingOwners
              .length,

          recipient_discord_ids:
            options
              .missingOwners
              .map(
                (owner) =>
                  owner.discordId,
              ),

          channel_message_id:
            options
              .channelMessageId ??
            null,

          dm_success_count:
            options
              .dmSuccessCount ??
            0,

          dm_failure_count:
            options
              .dmFailureCount ??
            0,

          details:
            options.details ??
            {},

          sent_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "active_check_id,reminder_key",
        },
      );

  if (result.error) {
    throw result.error;
  }
}

function resolveDiscordGuildId() {
  return (
    process.env
      .DISCORD_GUILD_ID
      ?.trim() ||
    process.env
      .DISCORD_GOLD_JACKET_GUILD_ID
      ?.trim() ||
    process.env
      .DISCORD_SERVER_ID
      ?.trim() ||
    null
  );
}

async function postMissingOwnerReminder(
  options: {
    check: ActiveCheckRow;

    key:
      Exclude<
        ActiveCheckReminderKey,
        "closed"
      >;

    missingOwners:
      MissingOwner[];
  },
) {
  const channelId =
    resolveChannelId(
      options.check,
    );

  if (!channelId) {
    throw new Error(
      "Active-check channel ID is unavailable.",
    );
  }

  if (
    options
      .missingOwners
      .length === 0
  ) {
    return null;
  }

  const guildId =
    resolveDiscordGuildId();

  if (!guildId) {
    throw new Error(
      "Discord guild ID is unavailable for Active Check reminders.",
    );
  }

  const roles =
    await discordRequest<
      DiscordGuildRole[]
    >(
      `/guilds/${guildId}/roles`,
    );

  const roleIds:
    string[] = [];

  const fallbackUserIds:
    string[] = [];

  const lines =
    options
      .missingOwners
      .map(
        (owner) => {
          const matches =
            roles.filter(
              (role) =>
                findTeamsFromDiscordRoleNames(
                  [role.name],
                ).some(
                  (team) =>
                    team.slug ===
                    owner.teamSlug,
                ),
            );

          if (
            matches.length === 1
          ) {
            const roleId =
              matches[0].id;

            roleIds.push(
              roleId,
            );

            return (
              `❌ **${owner.teamAbbreviation}** — ` +
              `<@&${roleId}>`
            );
          }

          /*
           * If a franchise role itself is malformed or
           * duplicated, fall back only to the CURRENT
           * reconciled owner — never a stale cached owner.
           */
          fallbackUserIds.push(
            owner.discordId,
          );

          console.warn(
            "Active Check reminder could not uniquely resolve franchise role:",
            {
              teamSlug:
                owner.teamSlug,

              roleMatches:
                matches.map(
                  (role) => ({
                    id:
                      role.id,
                    name:
                      role.name,
                  }),
                ),
            },
          );

          return (
            `❌ **${owner.teamAbbreviation}** — ` +
            `<@${owner.discordId}>`
          );
        },
      );

  const isFinal =
    options.key ===
    "final_warning";

  const heading =
    isFinal
      ? "🚨 **FINAL ACTIVE CHECK WARNING**"
      : "⚠️ **ACTIVE CHECK REMINDER**";

  const response =
    await discordRequest<{
      id: string;
    }>(
      `/channels/${channelId}/messages`,
      {
        method:
          "POST",

        body:
          JSON.stringify({
            content:
              `${heading}\n\n` +
              `**Still missing (${options.missingOwners.length}):**\n` +
              `${lines.join("\n")}\n\n` +
              `Hit **✅ I'm Active** on the current Active Check.`,

            allowed_mentions: {
              parse: [],

              roles: [
                ...new Set(
                  roleIds,
                ),
              ],

              users: [
                ...new Set(
                  fallbackUserIds,
                ),
              ],
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
            `<@${owner.discordId}> 🚨 **GOLD JACKET — FINAL ACTIVE CHECK WARNING**

You still have not completed the current Active Check. Please hit **I'm Active** in the server now. The check closes in about **30 minutes**, and a miss will be recorded if you do not respond.`,
          allowed_mentions: {
            parse: [],
            users: [owner.discordId],
          },
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
      team_slug: owner.teamSlug,
      team_abbreviation: owner.teamAbbreviation,
      member_id: owner.memberId,
      discord_id: owner.discordId,
      recorded_at: new Date().toISOString(),
    }));

    const missResult = await supabaseAdmin
      .from("active_check_misses")
      .upsert(misses, { onConflict: "active_check_id,team_slug" });

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

async function processOneCheck(
  check: ActiveCheckRow,
) {
  if (
    !check.closes_at ||
    check.status !== "open"
  ) {
    return {
      activeCheckId:
        check.active_check_id,

      action:
        "skipped",
    };
  }

  const now =
    new Date();

  const closesAt =
    new Date(
      check.closes_at,
    );

  const minutesRemaining =
    (
      closesAt.getTime() -
      now.getTime()
    ) /
    (60 * 1_000);

  /*
   * Waitlist checks don't have franchise-owner targeting.
   */
  if (
    check.check_type ===
    "waitlist"
  ) {
    if (
      minutesRemaining <= 0
    ) {
      await closeCheck(
        check,
        [],
      );

      return {
        activeCheckId:
          check.active_check_id,

        action:
          "closed",

        missing:
          0,
      };
    }

    return {
      activeCheckId:
        check.active_check_id,

      action:
        "waiting",

      minutesRemaining:
        Math.max(
          0,
          Math.round(
            minutesRemaining,
          ),
        ),

      missing:
        0,
    };
  }

  /*
   * SELF-HEAL FIRST.
   *
   * Discord's current franchise roles are authoritative.
   * If Discord cannot be loaded successfully, the
   * reconciler throws BEFORE modifying targets. We then
   * skip this cron cycle rather than pinging stale owners.
   */
  try {
    await reconcileActiveCheckTargets(
      check.active_check_id,
    );
  } catch (error) {
    console.error(
      "Active Check live ownership reconciliation failed:",
      {
        activeCheckId:
          check.active_check_id,

        error,
      },
    );

    return {
      activeCheckId:
        check.active_check_id,

      action:
        "reconcile_failed",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }

  let missingOwners =
    await getMissingOwners(
      check.active_check_id,
    );

  /*
   * Closure happens only after a successful fresh
   * ownership reconciliation, so misses cannot be written
   * against owners who no longer own the franchise.
   */
  if (
    minutesRemaining <= 0
  ) {
    await closeCheck(
      check,
      missingOwners,
    );

    return {
      activeCheckId:
        check.active_check_id,

      action:
        "closed",

      missing:
        missingOwners.length,
    };
  }

  if (
    missingOwners.length ===
    0
  ) {
    return {
      activeCheckId:
        check.active_check_id,

      action:
        "no_missing_owners",

      minutesRemaining:
        Math.max(
          0,
          Math.round(
            minutesRemaining,
          ),
        ),

      missing:
        0,
    };
  }

  const lastRecurringSentAt =
    await latestRecurringReminderSentAt(
      check.active_check_id,
    );

  let key:
    Exclude<
      ActiveCheckReminderKey,
      "closed"
    > | null =
      null;

  /*
   * finalWarningDue() itself enforces Phoenix quiet hours.
   */
  if (
    finalWarningDue({
      now,
      closesAt,

      lastReminderSentAt:
        lastRecurringSentAt,
    })
  ) {
    key =
      "final_warning";
  }

  /*
   * recurringReminderDue() enforces:
   *
   * - six-hour interval
   * - America/Phoenix timezone
   * - NO reminder from 11 PM through 8:59 AM
   * - overnight due reminder becomes eligible at 9 AM
   */
  else if (
    recurringReminderDue({
      now,

      startedAt:
        check.started_at,

      lastSentAt:
        lastRecurringSentAt,

      intervalHours:
        6,
    })
  ) {
    key =
      recurringReminderKey(
        now,
      ) as
        `recurring_${string}`;
  }

  if (!key) {
    return {
      activeCheckId:
        check.active_check_id,

      action:
        "waiting",

      minutesRemaining:
        Math.max(
          0,
          Math.round(
            minutesRemaining,
          ),
        ),

      missing:
        missingOwners.length,
    };
  }

  if (
    await reminderAlreadyRecorded(
      check.active_check_id,
      key,
    )
  ) {
    return {
      activeCheckId:
        check.active_check_id,

      action:
        "already_sent",

      reminder:
        key,

      missing:
        missingOwners.length,
    };
  }

  /*
   * Reserve before talking to Discord.
   *
   * The DB unique constraint makes duplicate cron
   * executions fail closed.
   */
  const reserved =
    await reserveReminderEvent({
      activeCheckId:
        check.active_check_id,

      reminderKey:
        key,

      missingOwners,
    });

  if (!reserved) {
    return {
      activeCheckId:
        check.active_check_id,

      action:
        "already_reserved",

      reminder:
        key,

      missing:
        missingOwners.length,
    };
  }

  /*
   * Re-read responses immediately before posting.
   * Someone who clicked during this cron execution will
   * not be tagged.
   */
  missingOwners =
    await getMissingOwners(
      check.active_check_id,
    );

  if (
    missingOwners.length ===
    0
  ) {
    await releaseReminderReservation(
      check.active_check_id,
      key,
    );

    return {
      activeCheckId:
        check.active_check_id,

      action:
        "no_missing_owners",

      reminder:
        key,

      missing:
        0,
    };
  }

  let channelMessageId:
    string | null =
      null;

  try {
    channelMessageId =
      await postMissingOwnerReminder({
        check,
        key,
        missingOwners,
      });
  } catch (error) {
    /*
     * No Discord post happened successfully, so release
     * this slot and allow the next cron invocation to retry.
     */
    await releaseReminderReservation(
      check.active_check_id,
      key,
    ).catch(
      (releaseError) => {
        console.error(
          "Unable to release failed Active Check reminder reservation:",
          releaseError,
        );
      },
    );

    throw error;
  }

  if (!channelMessageId) {
    await releaseReminderReservation(
      check.active_check_id,
      key,
    );

    return {
      activeCheckId:
        check.active_check_id,

      action:
        "no_missing_owners",

      reminder:
        key,

      missing:
        0,
    };
  }

  /*
   * The Discord post already exists now.
   *
   * If this metadata update fails, deliberately KEEP the
   * reservation row rather than delete it. That prevents
   * the same reminder slot from double-posting.
   */
  try {
    await recordReminderEvent({
      activeCheckId:
        check.active_check_id,

      reminderKey:
        key,

      missingOwners,

      channelMessageId,

      details: {
        kind:
          key ===
          "final_warning"
            ? "final_warning"
            : "recurring",

        intervalHours:
          6,

        timezone:
          "America/Phoenix",

        quietHours:
          "23:00-08:59",
      },
    });
  } catch (error) {
    console.error(
      "Active Check reminder posted but event metadata could not be finalized:",
      {
        activeCheckId:
          check.active_check_id,

        reminder:
          key,

        channelMessageId,

        error,
      },
    );

    return {
      activeCheckId:
        check.active_check_id,

      action:
        "sent_metadata_error",

      reminder:
        key,

      missing:
        missingOwners.length,

      channelMessageId,
    };
  }

  return {
    activeCheckId:
      check.active_check_id,

    action:
      "sent",

    reminder:
      key,

    missing:
      missingOwners.length,

    channelMessageId,
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
  const checkResult =
    await supabaseAdmin
      .from(
        "league_health_active_checks",
      )
      .select("*")
      .eq(
        "status",
        "open",
      )
      .order(
        "started_at",
        { ascending: false },
      )
      .limit(1)
      .maybeSingle();

  if (checkResult.error) {
    throw checkResult.error;
  }

  const check =
    (checkResult.data ?? null) as
      ActiveCheckRow |
      null;

  if (!check) {
    return {
      check: null,
      ownerCount: 0,
      checkedCount: 0,
      missingCount: 0,
    };
  }

  const [
    targetsResult,
    clicksResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from(
          "active_check_targets",
        )
        .select(
          "team_slug",
        )
        .eq(
          "active_check_id",
          check.active_check_id,
        ),

      supabaseAdmin
        .from(
          "active_check_clicks",
        )
        .select(
          "team_slug",
        )
        .eq(
          "active_check_id",
          check.active_check_id,
        ),
    ]);

  if (targetsResult.error) {
    throw targetsResult.error;
  }

  if (clicksResult.error) {
    throw clicksResult.error;
  }

  const requiredTeamSlugs =
    new Set(
      (targetsResult.data ?? [])
        .map(
          (row) =>
            row.team_slug,
        )
        .filter(Boolean),
    );

  const clickedTeamSlugs =
    new Set(
      (clicksResult.data ?? [])
        .map(
          (row) =>
            row.team_slug,
        )
        .filter(Boolean),
    );

  const ownerCount =
    requiredTeamSlugs.size;

  const checkedCount =
    [...requiredTeamSlugs]
      .filter(
        (teamSlug) =>
          clickedTeamSlugs.has(
            teamSlug,
          ),
      )
      .length;

  return {
    check,
    ownerCount,
    checkedCount,
    missingCount:
      Math.max(
        0,
        ownerCount -
          checkedCount,
      ),
  };
}
