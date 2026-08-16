import { supabaseAdmin } from "@/lib/supabase-admin";

const DISCORD_API = "https://discord.com/api/v10";
const TEXT_CHANNEL = 0;
const ANNOUNCEMENT_CHANNEL = 5;
const MAX_INCREMENTAL_PAGES = 10;
const CHANNEL_CONCURRENCY = 4;

type DiscordChannel = {
  id: string;
  guild_id?: string;
  name?: string;
  type: number;
  position?: number;
};

type DiscordMessage = {
  id: string;
  channel_id: string;
  timestamp: string;
  webhook_id?: string;
  author?: {
    id?: string;
    bot?: boolean;
  };
  embeds?: {
    title?: string;
  }[];
  components?: unknown[];
};

type ChannelState = {
  channel_id: string;
  last_message_id: string | null;
};

type ScanResult = {
  channel: DiscordChannel;
  messages: DiscordMessage[];
  latestMessageId: string | null;
  error: string | null;
};

export type DiscordActivitySyncResult = {
  skipped: boolean;
  channelsScanned: number;
  messagesSeen: number;
  messagesSaved: number;
  checksDiscovered: number;
  warnings: string[];
  completedAt: string | null;
};

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function maxSnowflake(ids: string[]) {
  if (ids.length === 0) return null;

  return ids.reduce((largest, current) => {
    try {
      return BigInt(current) > BigInt(largest)
        ? current
        : largest;
    } catch {
      return current > largest ? current : largest;
    }
  });
}

async function discordRequest<T>(
  path: string,
  attempt = 0,
): Promise<T> {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();

  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured.");
  }

  const response = await fetch(`${DISCORD_API}${path}`, {
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 429 && attempt < 3) {
    const rateLimit = (await response.json().catch(() => ({}))) as {
      retry_after?: number;
    };

    const waitMilliseconds = Math.max(
      1_000,
      Math.ceil(Number(rateLimit.retry_after ?? 1) * 1_000),
    );

    await sleep(waitMilliseconds);

    return discordRequest<T>(path, attempt + 1);
  }

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Discord API ${response.status}: ${body.slice(0, 240)}`,
    );
  }

  return (await response.json()) as T;
}

function parseChannelIds(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}


function countsAsRealChat(
  channel: DiscordChannel,
) {
  const name =
    (channel.name ?? "")
      .toLowerCase()
      .trim();

  return !/active.?check|rules?|announcement|gotw|game.?of.?the.?week|potw|player.?of.?the.?week|trade.?alert|prediction|sportsbook|website.?feed|bot|logs?|dev.?market|milestone|hall.?of.?champions|playoff.?bracket/i.test(
    name,
  );
}

function hasActiveCheckButton(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasActiveCheckButton(item));
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (record.custom_id === "active_check_join") {
    return true;
  }

  return Object.values(record).some((item) =>
    hasActiveCheckButton(item),
  );
}

function detectCheckType(title: string | null) {
  const normalized = title?.toLowerCase() ?? "";

  if (normalized.includes("waitlist")) return "waitlist";
  if (normalized.includes("week")) return "weekly";
  if (normalized.includes("league")) return "league";

  return "unknown";
}

async function scanChannel(
  channel: DiscordChannel,
  previousMessageId: string | null,
): Promise<ScanResult> {
  try {
    const collected: DiscordMessage[] = [];
    let after = previousMessageId;
    const isFirstScan = !after;

    for (
      let page = 0;
      page < (isFirstScan ? 1 : MAX_INCREMENTAL_PAGES);
      page += 1
    ) {
      const params = new URLSearchParams({
        limit: "100",
      });

      if (after) {
        params.set("after", after);
      }

      const messages = await discordRequest<DiscordMessage[]>(
        `/channels/${channel.id}/messages?${params.toString()}`,
      );

      if (messages.length === 0) break;

      collected.push(...messages);

      const newest = maxSnowflake(
        messages.map((message) => message.id),
      );

      if (!newest || newest === after || messages.length < 100) {
        break;
      }

      after = newest;
    }

    return {
      channel,
      messages: collected,
      latestMessageId:
        maxSnowflake(collected.map((message) => message.id)) ??
        previousMessageId,
      error: null,
    };
  } catch (error) {
    return {
      channel,
      messages: [],
      latestMessageId: previousMessageId,
      error:
        error instanceof Error
          ? error.message
          : "Unknown Discord channel error.",
    };
  }
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
      { length: Math.min(concurrency, items.length) },
      () => worker(),
    ),
  );

  return results;
}

async function markSyncStarted(startedAt: string) {
  const result = await supabaseAdmin
    .from("league_health_sync_state")
    .upsert(
      {
        id: "discord",
        last_started_at: startedAt,
        last_error: null,
        updated_at: startedAt,
      },
      {
        onConflict: "id",
      },
    );

  if (result.error) throw result.error;
}

async function markSyncFailed(errorMessage: string) {
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("league_health_sync_state")
    .upsert(
      {
        id: "discord",
        last_error: errorMessage.slice(0, 1_000),
        updated_at: now,
      },
      {
        onConflict: "id",
      },
    );
}

export async function syncDiscordLeagueActivity(
  options: {
    force?: boolean;
  } = {},
): Promise<DiscordActivitySyncResult> {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();

  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID is not configured.");
  }

  const stateResult = await supabaseAdmin
    .from("league_health_sync_state")
    .select("last_started_at, last_completed_at")
    .eq("id", "discord")
    .maybeSingle();

  if (stateResult.error) throw stateResult.error;

  const lastStarted = stateResult.data?.last_started_at
    ? new Date(stateResult.data.last_started_at)
    : null;

  const lastCompleted = stateResult.data?.last_completed_at
    ? new Date(stateResult.data.last_completed_at)
    : null;

  const appearsRunning =
    lastStarted &&
    (!lastCompleted ||
      lastStarted.getTime() > lastCompleted.getTime()) &&
    Date.now() - lastStarted.getTime() < 5 * 60 * 1_000;

  if (appearsRunning && !options.force) {
    return {
      skipped: true,
      channelsScanned: 0,
      messagesSeen: 0,
      messagesSaved: 0,
      checksDiscovered: 0,
      warnings: ["A Discord activity sync is already running."],
      completedAt: lastCompleted?.toISOString() ?? null,
    };
  }

  const startedAt = new Date().toISOString();
  await markSyncStarted(startedAt);

  try {
    const guildChannels = await discordRequest<DiscordChannel[]>(
      `/guilds/${guildId}/channels`,
    );

    const includedIds = parseChannelIds(
      process.env.LEAGUE_HEALTH_CHANNEL_IDS,
    );

    const excludedIds = parseChannelIds(
      process.env.LEAGUE_HEALTH_EXCLUDED_CHANNEL_IDS,
    );

    const activeCheckChannelId =
      process.env.DISCORD_ACTIVE_CHECK_CHANNEL_ID?.trim();

    let channels = guildChannels
      .filter(
        (channel) =>
          channel.type === TEXT_CHANNEL ||
          channel.type === ANNOUNCEMENT_CHANNEL,
      )
      .filter((channel) => !excludedIds.has(channel.id));

    if (includedIds.size > 0) {
      channels = channels.filter(
        (channel) =>
          includedIds.has(channel.id) ||
          channel.id === activeCheckChannelId,
      );
    }

    channels.sort(
      (left, right) =>
        Number(left.position ?? 0) - Number(right.position ?? 0),
    );

    const channelIds = channels.map((channel) => channel.id);

    const channelStateResult =
      channelIds.length > 0
        ? await supabaseAdmin
            .from("league_health_discord_channels")
            .select("channel_id, last_message_id")
            .in("channel_id", channelIds)
        : { data: [], error: null };

    if (channelStateResult.error) {
      throw channelStateResult.error;
    }

    const stateByChannel = new Map(
      ((channelStateResult.data ?? []) as ChannelState[]).map(
        (state) => [state.channel_id, state],
      ),
    );

    const scans = await mapWithConcurrency(
      channels,
      CHANNEL_CONCURRENCY,
      (channel) =>
        scanChannel(
          channel,
          stateByChannel.get(channel.id)?.last_message_id ?? null,
        ),
    );

    const warnings: string[] = [];
    const eventRows: {
      message_id: string;
      guild_id: string;
      channel_id: string;
      discord_id: string;
      posted_at: string;
      captured_at: string;
    }[] = [];

    const checkRows: {
      active_check_id: string;
      channel_id: string;
      check_type: "league" | "weekly" | "waitlist" | "unknown";
      title: string | null;
      started_at: string;
      discovered_at: string;
    }[] = [];

    const channelRows = scans.map((scan) => {
      if (scan.error) {
        warnings.push(
          `#${scan.channel.name ?? scan.channel.id}: ${scan.error}`,
        );
      }

      for (const message of scan.messages) {
        const authorId = message.author?.id;

        if (
          authorId &&
          !message.author?.bot &&
          !message.webhook_id &&
          countsAsRealChat(scan.channel)
        ) {
          eventRows.push({
            message_id: message.id,
            guild_id: guildId,
            channel_id: scan.channel.id,
            discord_id: authorId,
            posted_at: message.timestamp,
            captured_at: startedAt,
          });
        }

        const inActiveCheckChannel =
          activeCheckChannelId &&
          scan.channel.id === activeCheckChannelId;

        if (
          inActiveCheckChannel &&
          hasActiveCheckButton(message.components)
        ) {
          const title = message.embeds?.[0]?.title ?? null;

          checkRows.push({
            active_check_id: message.id,
            channel_id: scan.channel.id,
            check_type: detectCheckType(title),
            title,
            started_at: message.timestamp,
            discovered_at: startedAt,
          });
        }
      }

      return {
        channel_id: scan.channel.id,
        guild_id: guildId,
        channel_name: scan.channel.name ?? null,
        last_message_id: scan.latestMessageId,
        last_scanned_at: startedAt,
        last_error: scan.error,
        updated_at: startedAt,
      };
    });

    const uniqueEvents = Array.from(
      new Map(
        eventRows.map((row) => [row.message_id, row]),
      ).values(),
    );

    for (let index = 0; index < uniqueEvents.length; index += 500) {
      const chunk = uniqueEvents.slice(index, index + 500);

      const saveResult = await supabaseAdmin
        .from("league_health_discord_events")
        .upsert(chunk, {
          onConflict: "message_id",
          ignoreDuplicates: true,
        });

      if (saveResult.error) throw saveResult.error;
    }

    if (channelRows.length > 0) {
      const saveChannels = await supabaseAdmin
        .from("league_health_discord_channels")
        .upsert(channelRows, {
          onConflict: "channel_id",
        });

      if (saveChannels.error) throw saveChannels.error;
    }

    if (checkRows.length > 0) {
      const uniqueChecks = Array.from(
        new Map(
          checkRows.map((row) => [row.active_check_id, row]),
        ).values(),
      );

      const saveChecks = await supabaseAdmin
        .from("league_health_active_checks")
        .upsert(uniqueChecks, {
          onConflict: "active_check_id",
        });

      if (saveChecks.error) throw saveChecks.error;
    }

    const completedAt = new Date().toISOString();
    const messagesSeen = scans.reduce(
      (total, scan) => total + scan.messages.length,
      0,
    );
    const channelsScanned = scans.filter(
      (scan) => !scan.error,
    ).length;

    const completeResult = await supabaseAdmin
      .from("league_health_sync_state")
      .upsert(
        {
          id: "discord",
          last_started_at: startedAt,
          last_completed_at: completedAt,
          last_error:
            warnings.length > 0
              ? warnings.slice(0, 8).join(" | ").slice(0, 1_000)
              : null,
          channels_scanned: channelsScanned,
          messages_seen: messagesSeen,
          messages_saved: uniqueEvents.length,
          updated_at: completedAt,
        },
        {
          onConflict: "id",
        },
      );

    if (completeResult.error) throw completeResult.error;

    return {
      skipped: false,
      channelsScanned,
      messagesSeen,
      messagesSaved: uniqueEvents.length,
      checksDiscovered: checkRows.length,
      warnings,
      completedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Discord activity sync failed.";

    await markSyncFailed(message);
    throw error;
  }
}
