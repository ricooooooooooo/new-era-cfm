import {
  buildDivisionPayloads,
  type GoldJacketBoardClaim,
  type GoldJacketDivisionPayload,
} from "@/lib/gold-jackets/discord-board-format.mjs";

import { supabaseAdmin } from "@/lib/supabase-admin";

const LEAGUE_KEY =
  process.env.GOLD_JACKET_LEAGUE_KEY || "gold-jacket-cfm";

const DEFAULT_BOARD_CHANNEL_ID = "1531408027607892011";

type BoardMessageRow = {
  league_key: string;
  division_key: string;
  channel_id: string;
  message_id: string;
};

type DiscordMessage = {
  id: string;
};

class DiscordRequestError extends Error {
  status: number;

  constructor(status: number, body: string) {
    super(`Discord ${status}: ${body.slice(0, 500)}`);
    this.status = status;
  }
}

async function discordRequest(
  path: string,
  {
    method = "GET",
    body,
  }: {
    method?: string;
    body?: unknown;
  } = {},
) {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    throw new Error("Missing DISCORD_BOT_TOKEN.");
  }

  const response = await fetch(
    `https://discord.com/api/v10${path}`,
    {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
      cache: "no-store",
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new DiscordRequestError(
      response.status,
      text,
    );
  }

  if (!text) return null;

  return JSON.parse(text);
}

async function loadClaims(): Promise<GoldJacketBoardClaim[]> {
  const { data, error } = await supabaseAdmin
    .from("gold_jacket_claims")
    .select(
      "team_slug,candidate_key,player_name,player_position,display_name,discord_id,claimed_at",
    )
    .eq("league_key", LEAGUE_KEY);

  if (error) {
    throw new Error(
      `Unable to load Gold Jacket claims: ${error.message}`,
    );
  }

  return (data ?? []) as GoldJacketBoardClaim[];
}

async function loadMessageId(
  divisionKey: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("gold_jacket_discord_board_messages")
    .select("message_id")
    .eq("league_key", LEAGUE_KEY)
    .eq("division_key", divisionKey)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load Gold Jacket board state: ${error.message}`,
    );
  }

  return data?.message_id ?? null;
}

async function saveMessageId({
  divisionKey,
  channelId,
  messageId,
}: {
  divisionKey: string;
  channelId: string;
  messageId: string;
}) {
  const { error } = await supabaseAdmin
    .from("gold_jacket_discord_board_messages")
    .upsert(
      {
        league_key: LEAGUE_KEY,
        division_key: divisionKey,
        channel_id: channelId,
        message_id: messageId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "league_key,division_key",
      },
    );

  if (error) {
    throw new Error(
      `Unable to save Gold Jacket board state: ${error.message}`,
    );
  }
}

function discordPayload(
  payload: GoldJacketDivisionPayload,
) {
  return {
    content: payload.content,
    embeds: payload.embeds,
    allowed_mentions: {
      parse: [],
    },
  };
}

async function createDivisionMessage(
  channelId: string,
  payload: GoldJacketDivisionPayload,
): Promise<string> {
  const message = (await discordRequest(
    `/channels/${channelId}/messages`,
    {
      method: "POST",
      body: discordPayload(payload),
    },
  )) as DiscordMessage;

  if (!message?.id) {
    throw new Error(
      `Discord did not return a message ID for ${payload.divisionKey}.`,
    );
  }

  await saveMessageId({
    divisionKey: payload.divisionKey,
    channelId,
    messageId: message.id,
  });

  return message.id;
}

async function syncDivision(
  channelId: string,
  payload: GoldJacketDivisionPayload,
) {
  const existingMessageId =
    await loadMessageId(payload.divisionKey);

  if (!existingMessageId) {
    const messageId = await createDivisionMessage(
      channelId,
      payload,
    );

    return {
      divisionKey: payload.divisionKey,
      action: "created" as const,
      messageId,
    };
  }

  try {
    await discordRequest(
      `/channels/${channelId}/messages/${existingMessageId}`,
      {
        method: "PATCH",
        body: discordPayload(payload),
      },
    );

    return {
      divisionKey: payload.divisionKey,
      action: "updated" as const,
      messageId: existingMessageId,
    };
  } catch (error) {
    if (
      error instanceof DiscordRequestError &&
      error.status === 404
    ) {
      const messageId = await createDivisionMessage(
        channelId,
        payload,
      );

      return {
        divisionKey: payload.divisionKey,
        action: "recreated" as const,
        messageId,
      };
    }

    throw error;
  }
}

export async function syncGoldJacketDiscordBoard({
  origin,
  teamSlug,
}: {
  origin: string;
  teamSlug?: string | null;
}) {
  const channelId =
    process.env.DISCORD_GOLD_JACKET_BOARD_CHANNEL_ID ||
    DEFAULT_BOARD_CHANNEL_ID;

  const claims = await loadClaims();

  const payloads = buildDivisionPayloads({
    claims,
    origin,
    onlyTeamSlug: teamSlug ?? null,
  });

  if (teamSlug && payloads.length !== 1) {
    throw new Error(
      `Unable to resolve Gold Jacket division for team "${teamSlug}".`,
    );
  }

  const results = [];

  // Sequential intentionally: avoids hammering Discord rate limits.
  for (const payload of payloads) {
    results.push(
      await syncDivision(channelId, payload),
    );
  }

  return {
    ok: true as const,
    channelId,
    divisions: results,
  };
}
