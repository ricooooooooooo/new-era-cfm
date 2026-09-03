import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  canPublishTrade,
  decisionFromVotes,
  tradeSummaryLabel,
  voteMutation,
  tradeMishMentionMode,
  discordBotGuildMemberPath,
} from "@/lib/discord/trade-workflow-core.mjs";

const RESPONSE_CHANNEL_MESSAGE = 4;
const RESPONSE_UPDATE_MESSAGE = 7;

const GOLD = 0xd4af37;
const GREEN = 0x57f287;
const RED = 0xed4245;

const TRADE_MISH_ROLE_ID =
  process.env
    .DISCORD_TRADE_COMMITTEE_ROLE_ID
    ?.trim() ||
  "1531408025213210691";

type TradeRow = {
  id: string;
  team_one: string;
  team_one_sends: string;
  team_two: string;
  team_two_sends: string;
  status: string;
  report_text: string | null;
  graphic_url: string | null;
  approved_at: string | null;
  approved_by_discord_id: string | null;
  rejected_at: string | null;
  rejected_by_discord_id: string | null;
  google_form_timestamp: string | null;
  discord_message_id: string | null;
  discord_channel_id: string | null;
  committee_approved_at: string | null;
  approval_discord_message_id: string | null;
  approval_discord_channel_id: string | null;
  created_at: string;
  updated_at: string;
};

type TradeVote = {
  trade_id: string;
  discord_id: string;
  display_name: string | null;
  vote: "approve" | "deny";
  voted_at: string;
  change_count: number;
};

type DiscordMessage = {
  id: string;
  channel_id: string;
  mention_roles?: string[];
};

const TRADE_SELECT =
  "id,team_one,team_one_sends,team_two,team_two_sends,status,report_text,graphic_url,approved_at,approved_by_discord_id,rejected_at,rejected_by_discord_id,google_form_timestamp,discord_message_id,discord_channel_id,committee_approved_at,approval_discord_message_id,approval_discord_channel_id,created_at,updated_at";

function clean(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function clip(
  value: unknown,
  max: number,
) {
  const text = clean(value);

  if (text.length <= max) {
    return text;
  }

  return (
    text.slice(
      0,
      Math.max(0, max - 1),
    ) + "…"
  );
}

function interactionUserId(
  interaction: any,
) {
  return clean(
    interaction?.member?.user?.id ??
      interaction?.user?.id,
  );
}

function interactionDisplayName(
  interaction: any,
) {
  return clean(
    interaction?.member?.nick ??
      interaction?.member?.user
        ?.global_name ??
      interaction?.member?.user
        ?.username ??
      interaction?.user
        ?.global_name ??
      interaction?.user
        ?.username ??
      "Trade Commissioner",
  );
}

function tradeMishCanVote(
  interaction: any,
) {
  const roles =
    Array.isArray(
      interaction?.member?.roles,
    )
      ? interaction.member.roles.map(
          String,
        )
      : [];

  return roles.includes(
    TRADE_MISH_ROLE_ID,
  );
}

function commissionerIds() {
  return new Set(
    (
      process.env
        .NEW_ERA_COMMISSIONER_DISCORD_IDS ??
      ""
    ).match(/\d{15,22}/g) ?? [],
  );
}

async function tradeStaffAllowed(
  interaction: any,
) {
  const userId =
    interactionUserId(interaction);

  if (!userId) {
    return false;
  }

  /*
   * Server managers retain emergency authority.
   */
  try {
    const rawPermissions =
      interaction?.member?.permissions;

    if (rawPermissions != null) {
      const permissions =
        BigInt(
          String(rawPermissions),
        );

      const ADMINISTRATOR =
        BigInt(8);

      const MANAGE_GUILD =
        BigInt(32);

      if (
        (permissions &
          ADMINISTRATOR) ===
          ADMINISTRATOR ||
        (permissions &
          MANAGE_GUILD) ===
          MANAGE_GUILD
      ) {
        return true;
      }
    }
  } catch {
    // Continue through other checks.
  }

  if (
    commissionerIds().has(
      userId,
    )
  ) {
    return true;
  }

  const roleId =
    process.env
      .DISCORD_TRADE_COMMITTEE_ROLE_ID
      ?.trim();

  const roles =
    Array.isArray(
      interaction?.member?.roles,
    )
      ? interaction.member.roles.map(
          String,
        )
      : [];

  if (
    roleId &&
    roles.includes(roleId)
  ) {
    return true;
  }

  const {
    data: member,
    error,
  } =
    await supabaseAdmin
      .from("members")
      .select("role")
      .eq("discord_id", userId)
      .maybeSingle();

  if (error) {
    console.error(
      "Unable to verify trade staff membership:",
      error,
    );

    return false;
  }

  const staffRole =
    String(
      member?.role ?? "",
    )
      .trim()
      .toLowerCase();

  return [
    "admin",
    "commissioner",
    "trade_committee",
  ].includes(staffRole);
}

function ephemeral(
  content: string,
  extra:
    Record<string, unknown> = {},
) {
  return {
    type: RESPONSE_CHANNEL_MESSAGE,
    data: {
      content,
      flags: 64,
      ...extra,
    },
  };
}

function updateMessage(
  data: Record<string, unknown>,
) {
  return {
    type:
      RESPONSE_UPDATE_MESSAGE,
    data,
  };
}

function commandOption(
  interaction: any,
  name: string,
) {
  const options =
    Array.isArray(
      interaction?.data?.options,
    )
      ? interaction.data.options
      : [];

  return clean(
    options.find(
      (option: any) =>
        option?.name === name,
    )?.value,
  );
}

async function discordRequest(
  pathname: string,
  {
    method = "POST",
    body,
  }: {
    method?: "POST" | "PATCH";
    body: unknown;
  },
) {
  const token =
    process.env
      .DISCORD_BOT_TOKEN
      ?.trim();

  if (!token) {
    throw new Error(
      "DISCORD_BOT_TOKEN is missing.",
    );
  }

  const response =
    await fetch(
      `https://discord.com/api/v10${pathname}`,
      {
        method,
        headers: {
          Authorization:
            `Bot ${token}`,
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify(body),
        cache: "no-store",
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Discord ${response.status}: ${text}`,
    );
  }

  return text
    ? JSON.parse(text)
    : null;
}

async function readTrade(
  tradeId: string,
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("trades")
      .select(TRADE_SELECT)
      .eq("id", tradeId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load trade: ${error.message}`,
    );
  }

  return data
    ? (
        data as unknown as TradeRow
      )
    : null;
}

async function loadVotes(
  tradeId: string,
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "trade_committee_votes",
      )
      .select(
        "trade_id,discord_id,display_name,vote,voted_at,change_count",
      )
      .eq("trade_id", tradeId)
      .order(
        "voted_at",
        { ascending: true },
      );

  if (error) {
    throw new Error(
      `Unable to load trade votes: ${error.message}`,
    );
  }

  return (
    data ?? []
  ) as unknown as TradeVote[];
}

function voteCounts(
  votes: TradeVote[],
) {
  return {
    approvals:
      votes.filter(
        (vote) =>
          vote.vote === "approve",
      ).length,

    denials:
      votes.filter(
        (vote) =>
          vote.vote === "deny",
      ).length,
  };
}

function voteList(
  votes: TradeVote[],
) {
  if (!votes.length) {
    return "No votes yet.";
  }

  return votes
    .map(
      (vote) =>
        `${vote.vote === "approve" ? "✅" : "❌"} <@${vote.discord_id}>`,
    )
    .join("\n");
}

function tradeState(
  trade: TradeRow,
) {
  if (
    trade.status ===
    "rejected"
  ) {
    return "rejected";
  }

  if (
    trade.status ===
      "approved" &&
    trade.google_form_timestamp
  ) {
    return "form_verified";
  }

  if (
    trade.committee_approved_at
  ) {
    return "committee_approved";
  }

  return "pending";
}

function extractTradePlayerNames(
  value: string,
) {
  return String(
    value ?? "",
  )
    .split(
      /\r?\n|,|;|\s+\+\s+|\s+\|\s+|\s+&\s+/,
    )
    .map(
      (piece) =>
        clean(piece),
    )
    .filter(Boolean)
    .filter(
      (piece) =>
        !/\b(?:20\d{2}\s*)?(?:1st|2nd|3rd|4th|5th|6th|7th|first|second|third|fourth|fifth|sixth|seventh)\b/i.test(
          piece,
        ),
    )
    .filter(
      (piece) =>
        !/\b(?:draft|round|pick)\b/i.test(
          piece,
        ),
    )
    .filter(
      (piece) =>
        !/^\d+(?:\.\d+)?$/.test(
          piece,
        ),
    )
    .slice(
      0,
      3,
    );
}

function tradePlayerHeadshotUrl(
  playerName: string,
) {
  const url =
    new URL(
      `${siteBaseUrl()}/api/media/potw-headshot`,
    );

  /*
   * Existing route compatibility:
   * whichever query-key the current endpoint uses
   * can read the same player value.
   */
  url.searchParams.set(
    "player",
    playerName,
  );

  url.searchParams.set(
    "playerName",
    playerName,
  );

  url.searchParams.set(
    "name",
    playerName,
  );

  return url.toString();
}

function tradePlayerEmbeds(
  trade: TradeRow,
) {
  const players = [
    ...extractTradePlayerNames(
      trade.team_one_sends,
    ).map(
      (name) => ({
        name,
        team:
          trade.team_one,
      }),
    ),

    ...extractTradePlayerNames(
      trade.team_two_sends,
    ).map(
      (name) => ({
        name,
        team:
          trade.team_two,
      }),
    ),
  ].slice(
    0,
    6,
  );

  return players.map(
    (player) => ({
      title:
        clip(
          player.name,
          250,
        ),

      description:
        `**${clip(player.team, 150)}** • Trade Package`,

      color:
        GOLD,

      thumbnail: {
        url:
          tradePlayerHeadshotUrl(
            player.name,
          ),
      },

      footer: {
        text:
          "Gold Jacket CFM Player",
      },
    }),
  );
}

function approvalEmbed(
  trade: TradeRow,
  votes: TradeVote[],
) {
  const state =
    tradeState(trade);

  const {
    approvals,
    denials,
  } =
    voteCounts(votes);

  let color = GOLD;

  let status =
    "⏳ **REVIEW IN PROGRESS**";

  if (
    state ===
    "committee_approved"
  ) {
    color = GREEN;

    status =
      "✅ **COMMITTEE APPROVED — 3✅ REACHED**\n" +
      "**/trade-summary is now required.**\n" +
      "No backing out of an accepted trade.";
  }

  if (
    state === "rejected"
  ) {
    color = RED;

    status =
      "❌ **TRADE DENIED — 2❌ REACHED**\n" +
      "This trade cannot reach Schefter.";
  }

  if (
    state ===
    "form_verified"
  ) {
    color = GREEN;

    status =
      "✅ **GOOGLE FORM VERIFIED**\n" +
      "Trade is now eligible for `/trade-summary`.";
  }

  return {
    title:
      "GOLD JACKET TRADE COMMITTEE",

    description:
      `**${tradeSummaryLabel(trade)}**`,

    color,

    fields: [
      {
        name:
          `${clip(trade.team_one, 180)} SENDS`,
        value:
          clip(
            trade.team_one_sends,
            1000,
          ) ||
          "No assets listed.",
      },
      {
        name:
          `${clip(trade.team_two, 180)} SENDS`,
        value:
          clip(
            trade.team_two_sends,
            1000,
          ) ||
          "No assets listed.",
      },
      {
        name:
          "COMMITTEE VOTE",
        value:
          `✅ Approve — **${approvals}/3**\n` +
          `❌ Deny — **${denials}/2**`,
      },
      {
        name: "VOTES",
        value:
          clip(
            voteList(votes),
            1000,
          ),
      },
      {
        name: "STATUS",
        value: status,
      },
      {
        name:
          "RULE REMINDER",
        value:
          "3✅ approves • 2❌ denies\n" +
          "Committee must verify trade limits, player restrictions, premium-player limits, package limits, cap ≤ $40M, value, and competitive balance.",
      },
    ],

    footer: {
      text:
        "Gold Jacket CFM • One vote per committee member",
    },

    timestamp:
      new Date().toISOString(),
  };
}

function votingComponents(
  tradeId: string,
) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: "Approve",
          custom_id:
            `trade_vote_approve:${tradeId}`,
        },
        {
          type: 2,
          style: 4,
          label: "Deny",
          custom_id:
            `trade_vote_deny:${tradeId}`,
        },
      ],
    },
  ];
}

async function discordBotToken() {
  const token =
    process.env
      .DISCORD_BOT_TOKEN
      ?.trim();

  if (!token) {
    throw new Error(
      "DISCORD_BOT_TOKEN is missing.",
    );
  }

  return token;
}

async function discordJson(
  pathname: string,
  options: {
    method?: "GET" | "PATCH" | "DELETE";
    body?: unknown;
  } = {},
) {
  const token =
    await discordBotToken();

  const method =
    options.method ??
    "GET";

  const response =
    await fetch(
      `https://discord.com/api/v10${pathname}`,
      {
        method,
        headers: {
          Authorization:
            `Bot ${token}`,
          ...(options.body !== undefined
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
        },
        body:
          options.body !== undefined
            ? JSON.stringify(
                options.body,
              )
            : undefined,
        cache: "no-store",
      },
    );

  const raw =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Discord ${method} ${response.status}: ${raw}`,
    );
  }

  if (!raw) {
    return null;
  }

  return JSON.parse(raw);
}

async function prepareTradeMishPing() {
  const guildId =
    process.env
      .DISCORD_GUILD_ID
      ?.trim();

  if (!guildId) {
    throw new Error(
      "DISCORD_GUILD_ID is missing.",
    );
  }

  const [
    roles,
    botMember,
  ] =
    await Promise.all([
      discordJson(
        `/guilds/${guildId}/roles`,
      ),

      (async () => {
        const botUser =
          await discordJson(
            "/users/@me",
          );

        const botUserId =
          String(
            botUser?.id ?? "",
          ).trim();

        if (!botUserId) {
          throw new Error(
            "Discord bot user ID could not be resolved.",
          );
        }

        return discordJson(
          discordBotGuildMemberPath(
            guildId,
            botUserId,
          ),
        );
      })(),
    ]);

  if (
    !Array.isArray(roles)
  ) {
    throw new Error(
      "Discord guild roles could not be loaded.",
    );
  }

  const tradeMishRole =
    roles.find(
      (role: any) =>
        String(role?.id) ===
        TRADE_MISH_ROLE_ID,
    );

  if (!tradeMishRole) {
    throw new Error(
      `Trade Mish role ${TRADE_MISH_ROLE_ID} does not exist in the configured guild.`,
    );
  }

  const botRoleIds =
    new Set<string>([
      guildId,

      ...(
        Array.isArray(
          botMember?.roles,
        )
          ? botMember.roles.map(
              String,
            )
          : []
      ),
    ]);

  let permissions =
    BigInt(0);

  for (const role of roles) {
    if (
      !botRoleIds.has(
        String(role?.id),
      )
    ) {
      continue;
    }

    try {
      permissions |=
        BigInt(
          String(
            role?.permissions ??
            "0",
          ),
        );
    } catch {
      // Ignore malformed role permission data.
    }
  }

  const ADMINISTRATOR =
    BigInt(8);

  const MENTION_EVERYONE =
    BigInt(131072);

  const botCanMentionAllRoles =
    (
      permissions &
      ADMINISTRATOR
    ) ===
      ADMINISTRATOR ||
    (
      permissions &
      MENTION_EVERYONE
    ) ===
      MENTION_EVERYONE;

  const mode =
    tradeMishMentionMode({
      roleMentionable:
        Boolean(
          tradeMishRole
            ?.mentionable,
        ),

      botCanMentionAllRoles,
    });

  if (
    mode === "direct"
  ) {
    return async () => {};
  }

  /*
   * The role is normally protected from random mentions.
   * Temporarily enable it only while the bot posts the
   * Trade Approval message, then immediately restore it.
   */
  await discordJson(
    `/guilds/${guildId}/roles/${TRADE_MISH_ROLE_ID}`,
    {
      method: "PATCH",
      body: {
        mentionable: true,
      },
    },
  );

  let restored = false;

  return async () => {
    if (restored) {
      return;
    }

    restored = true;

    try {
      await discordJson(
        `/guilds/${guildId}/roles/${TRADE_MISH_ROLE_ID}`,
        {
          method:
            "PATCH",

          body: {
            mentionable:
              false,
          },
        },
      );
    } catch (error) {
      console.error(
        "Trade Mish role was temporarily mentionable but could not be restored:",
        error,
      );
    }
  };
}

async function deleteDiscordMessage(
  channelId: string,
  messageId: string,
) {
  await discordJson(
    `/channels/${channelId}/messages/${messageId}`,
    {
      method:
        "DELETE",
    },
  );
}

export async function postTradeApprovalRequest({
  trade,
}: {
  trade: unknown;
}) {
  const row =
    trade as TradeRow;

  const channelId =
    process.env
      .TRADE_APPROVAL_CHANNEL_ID
      ?.trim();

  if (!channelId) {
    throw new Error(
      "TRADE_APPROVAL_CHANNEL_ID is missing.",
    );
  }

  const committeeRoleId =
    TRADE_MISH_ROLE_ID;

  const restoreTradeMishRole =
    await prepareTradeMishPing();

  let message:
    DiscordMessage;

  try {
    message =
      await discordRequest(
        `/channels/${channelId}/messages`,
        {
          body: {
            content:
              `<@&${committeeRoleId}> **NEW TRADE — COMMITTEE VOTE REQUIRED**`,

            embeds: [
              approvalEmbed(
                row,
                [],
              ),
              ...tradePlayerEmbeds(
                row,
              ),
            ],

            components:
              votingComponents(
                row.id,
              ),

            allowed_mentions: {
              parse: [],
              roles: [
                committeeRoleId,
              ],
            },
          },
        },
      ) as DiscordMessage;

    /*
     * Don't silently accept a broken ping.
     * Discord tells us which roles were actually parsed.
     */
    if (
      !Array.isArray(
        message.mention_roles,
      ) ||
      !message.mention_roles.includes(
        committeeRoleId,
      )
    ) {
      try {
        await deleteDiscordMessage(
          message.channel_id,
          message.id,
        );
      } catch (
        deleteError
      ) {
        console.error(
          "Unable to remove Trade Approval message after failed role mention:",
          deleteError,
        );
      }

      throw new Error(
        "Trade Approval was blocked because Discord did not register the Trade Mish role mention.",
      );
    }
  } finally {
    await restoreTradeMishRole();
  }

  const {
    error,
  } =
    await supabaseAdmin
      .from("trades")
      .update({
        approval_discord_message_id:
          message.id,

        approval_discord_channel_id:
          message.channel_id,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", row.id);

  if (error) {
    console.error(
      "Trade approval message posted but IDs could not be saved:",
      error,
    );
  }

  return message;
}

async function createTradeSubmit({
  teamOne,
  teamOneSends,
  teamTwo,
  teamTwoSends,
}: {
  teamOne: string;
  teamOneSends: string;
  teamTwo: string;
  teamTwoSends: string;
}) {
  const now =
    new Date().toISOString();

  const reportText =
    `# GOLD JACKET TRADE\n\n` +
    `**${teamOne} sends:**\n${teamOneSends}\n\n` +
    `**${teamTwo} sends:**\n${teamTwoSends}`;

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("trades")
      .insert({
        submitted_at: now,

        team_one:
          teamOne,

        team_one_sends:
          teamOneSends,

        team_two:
          teamTwo,

        team_two_sends:
          teamTwoSends,

        status: "pending",

        report_text:
          reportText,

        source:
          "discord_trade_review",

        updated_at: now,
      })
      .select(TRADE_SELECT)
      .single();

  if (
    error ||
    !data
  ) {
    throw new Error(
      `Unable to create trade review: ${error?.message ?? "Unknown error"}`,
    );
  }

  return data as unknown as TradeRow;
}

async function recordVote({
  tradeId,
  interaction,
  vote,
}: {
  tradeId: string;
  interaction: any;
  vote:
    "approve" | "deny";
}) {
  const discordId =
    interactionUserId(
      interaction,
    );

  const displayName =
    interactionDisplayName(
      interaction,
    );

  const {
    data: existing,
    error: existingError,
  } =
    await supabaseAdmin
      .from(
        "trade_committee_votes",
      )
      .select(
        "trade_id,discord_id,display_name,vote,voted_at,change_count",
      )
      .eq(
        "trade_id",
        tradeId,
      )
      .eq(
        "discord_id",
        discordId,
      )
      .maybeSingle();

  if (existingError) {
    throw new Error(
      `Unable to inspect committee vote: ${existingError.message}`,
    );
  }

  const action =
    voteMutation(
      existing,
      vote,
    );

  if (
    action === "same"
  ) {
    return {
      kind: "same" as const,
      vote:
        existing?.vote ??
        vote,
    };
  }

  if (
    action === "locked"
  ) {
    return {
      kind: "locked" as const,
      vote:
        existing?.vote ??
        vote,
    };
  }

  if (
    action === "insert"
  ) {
    const {
      error,
    } =
      await supabaseAdmin
        .from(
          "trade_committee_votes",
        )
        .insert({
          trade_id:
            tradeId,

          discord_id:
            discordId,

          display_name:
            displayName,

          vote,

          change_count:
            0,
        });

    if (!error) {
      return {
        kind:
          "inserted" as const,
        vote,
      };
    }

    if (
      error.code ===
      "23505"
    ) {
      return {
        kind:
          "locked" as const,
        vote,
      };
    }

    throw new Error(
      `Unable to save committee vote: ${error.message}`,
    );
  }

  if (
    action === "change"
  ) {
    const now =
      new Date().toISOString();

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "trade_committee_votes",
        )
        .update({
          vote,

          display_name:
            displayName,

          change_count:
            1,

          voted_at:
            now,
        })
        .eq(
          "trade_id",
          tradeId,
        )
        .eq(
          "discord_id",
          discordId,
        )
        .eq(
          "change_count",
          0,
        )
        .eq(
          "vote",
          existing?.vote,
        )
        .select(
          "trade_id,discord_id,display_name,vote,voted_at,change_count",
        )
        .maybeSingle();

    if (error) {
      throw new Error(
        `Unable to change committee vote: ${error.message}`,
      );
    }

    if (!data) {
      return {
        kind:
          "locked" as const,
        vote:
          existing?.vote ??
          vote,
      };
    }

    return {
      kind:
        "changed" as const,
      vote,
    };
  }

  throw new Error(
    "Invalid committee vote action.",
  );
}

async function finalizeDecision(
  trade: TradeRow,
  votes: TradeVote[],
  actorId: string,
) {
  const decision =
    decisionFromVotes(
      votes,
    );

  if (
    decision === "pending"
  ) {
    return trade;
  }

  const now =
    new Date().toISOString();

  if (
    decision === "approved"
  ) {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("trades")
        .update({
          status:
            "approved",

          approved_at:
            now,

          committee_approved_at:
            now,

          approved_by_discord_id:
            actorId,

          updated_at:
            now,
        })
        .eq("id", trade.id)
        .eq(
          "status",
          "pending",
        )
        .is(
          "committee_approved_at",
          null,
        )
        .select(TRADE_SELECT)
        .maybeSingle();

    if (error) {
      throw new Error(
        `Unable to finalize committee approval: ${error.message}`,
      );
    }

    return data
      ? (
          data as unknown as TradeRow
        )
      : (
          await readTrade(
            trade.id,
          )
        )!;
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("trades")
      .update({
        status:
          "rejected",

        rejected_at:
          now,

        rejected_by_discord_id:
          actorId,

        updated_at:
          now,
      })
      .eq("id", trade.id)
      .eq(
        "status",
        "pending",
      )
      .is(
        "committee_approved_at",
        null,
      )
      .select(TRADE_SELECT)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to finalize trade denial: ${error.message}`,
    );
  }

  return data
    ? (
        data as unknown as TradeRow
      )
    : (
        await readTrade(
          trade.id,
        )
      )!;
}

async function handleVote(
  interaction: any,
  tradeId: string,
  vote:
    "approve" | "deny",
) {
  if (!tradeMishCanVote(interaction)) {
    return ephemeral(
      "⛔ Only members with the Trade Commish role can approve or deny trades.",
    );
  }

  if (
    !tradeMishCanVote(
      interaction,
    )
  ) {
    return ephemeral(
      "⛔ Only members with the Trade Mish role can vote on trades.",
    );
  }

  const trade =
    await readTrade(
      tradeId,
    );

  if (!trade) {
    return ephemeral(
      "❌ That trade no longer exists.",
    );
  }

  if (
    trade.status !==
      "pending" ||
    trade.committee_approved_at
  ) {
    return ephemeral(
      "🔒 Voting on this trade is already closed.",
    );
  }

  const result =
    await recordVote({
      tradeId,
      interaction,
      vote,
    });

  if (
    result.kind === "same"
  ) {
    return ephemeral(
      `Your vote is already ${result.vote === "approve" ? "✅ Approve" : "❌ Deny"}. Nothing changed.`,
    );
  }

  if (
    result.kind === "locked"
  ) {
    return ephemeral(
      `🔒 Your vote is locked at ${result.vote === "approve" ? "✅ Approve" : "❌ Deny"}. You already used your one allowed correction.`,
    );
  }

  let votes =
    await loadVotes(
      tradeId,
    );

  let updated =
    await finalizeDecision(
      trade,
      votes,
      interactionUserId(
        interaction,
      ),
    );

  updated =
    (
      await readTrade(
        tradeId,
      )
    ) ?? updated;

  votes =
    await loadVotes(
      tradeId,
    );

  const state =
    tradeState(updated);

  return updateMessage({
    content:
      state ===
      "committee_approved"
        ? "✅ **TRADE COMMITTEE APPROVED — SEND THIS EXACT TRADE TO THE GOOGLE FORM.**"
        : state ===
          "rejected"
        ? "❌ **TRADE DENIED.**"
        : "⚖️ **TRADE COMMITTEE VOTING IN PROGRESS**",

    embeds: [
      approvalEmbed(
        updated,
        votes,
      ),
      ...tradePlayerEmbeds(
        updated,
      ),
    ],

    components:
      state === "pending"
        ? votingComponents(
            tradeId,
          )
        : [],

    allowed_mentions: {
      parse: [],
    },
  });
}

async function handleTradeSubmitCommand(
  interaction: any,
) {
  const teamOne =
    commandOption(
      interaction,
      "team-one",
    );

  const teamOneSends =
    commandOption(
      interaction,
      "team-one-sends",
    );

  const teamTwo =
    commandOption(
      interaction,
      "team-two",
    );

  const teamTwoSends =
    commandOption(
      interaction,
      "team-two-sends",
    );

  if (
    !teamOne ||
    !teamOneSends ||
    !teamTwo ||
    !teamTwoSends
  ) {
    return ephemeral(
      "❌ Both teams and both asset packages are required.",
    );
  }

  if (
    teamOne.toLowerCase() ===
    teamTwo.toLowerCase()
  ) {
    return ephemeral(
      "❌ A team cannot trade with itself.",
    );
  }

  const trade =
    await createTradeSubmit({
      teamOne,
      teamOneSends,
      teamTwo,
      teamTwoSends,
    });

  try {
    const message =
      await postTradeApprovalRequest({
        trade,
      });

    const guildId =
      clean(
        interaction?.guild_id,
      );

    const link =
      guildId
        ? `https://discord.com/channels/${guildId}/${message.channel_id}/${message.id}`
        : "";

    return ephemeral(
      `✅ Trade sent to the Trade Committee for voting.${link ? `\n${link}` : ""}\n\n**3✅ approves • 2❌ denies.**`,
    );
  } catch (error) {
    console.error(
      "Trade review saved but Discord approval post failed:",
      error,
    );

    return ephemeral(
      "⚠️ The trade was saved as pending, but the Trade Approval message could not be posted.",
    );
  }
}

async function approvedUnpublishedTrades() {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("trades")
      .select(TRADE_SELECT)
      .eq(
        "status",
        "approved",
      )
      .not(
        "committee_approved_at",
        "is",
        null,
      )
      .is(
        "discord_message_id",
        null,
      )
      .order(
        "approved_at",
        {
          ascending: false,
        },
      )
      .limit(25);

  if (error) {
    throw new Error(
      `Unable to load approved trades: ${error.message}`,
    );
  }

  return (
    (
      data ?? []
    ) as unknown as TradeRow[]
  ).filter(
    (trade) =>
      canPublishTrade(
        trade,
      ),
  );
}

function selectDescription(
  trade: TradeRow,
) {
  return clip(
    `${trade.team_one}: ${trade.team_one_sends} | ${trade.team_two}: ${trade.team_two_sends}`,
    95,
  );
}

function siteBaseUrl() {
  return (
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    process.env
      .SITE_URL ||
    "https://new-era-cfm.vercel.app"
  ).replace(
    /\/+$/,
    "",
  );
}

function tradeBroadcastImageUrl(
  trade: TradeRow,
) {
  return (
    `${siteBaseUrl()}/api/trades/` +
    `${encodeURIComponent(trade.id)}/image?v=sharp-v2`
  );
}

function buildTradeBroadcastEmbed(
  trade: TradeRow,
) {
  return {
    color:
      GOLD,

    image: {
      url:
        tradeBroadcastImageUrl(
          trade,
        ),
    },
  };
}

async function sendSchefterTradeAlert(
  trade: TradeRow,
) {
  const token =
    process.env
      .ADAM_SCHEFTER_BOT_TOKEN
      ?.trim();

  const channelId =
    process.env
      .TRADE_ALERT_CHANNEL_ID
      ?.trim();

  if (
    !token ||
    !channelId
  ) {
    throw new Error(
      "Adam Schefter trade alert configuration is missing.",
    );
  }

  const {
    renderSchefterTradeImageBlob,
  } =
    await import(
      "@/lib/discord/schefter-direct-image"
    );

  const image =
    await renderSchefterTradeImageBlob(
      trade,
    );

  const filename =
    `schefter-x-trade-${trade.id}.png`;

  const formData =
    new FormData();

  formData.append(
    "payload_json",
    JSON.stringify({
      content:
        "@everyone",

      embeds: [
        {
          image: {
            url:
              `attachment://${filename}`,
          },
        },
      ],

      allowed_mentions: {
        parse: [
          "everyone",
        ],
      },
    }),
  );

  formData.append(
    "files[0]",
    image,
    filename,
  );

  const response =
    await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bot ${token}`,
        },

        body:
          formData,
      },
    );

  const body =
    await response.text();

  if (
    !response.ok
  ) {
    throw new Error(
      `Schefter Discord ${response.status}: ${body}`,
    );
  }

  const message =
    JSON.parse(
      body,
    ) as DiscordMessage;

  return {
    message,

    imageUrl:
      `attachment://${filename}`,
  };
}

async function lockTradeForPublishing(
  tradeId: string,
  interactionId: string,
) {
  const now =
    new Date().toISOString();

  const lock =
    `publishing:${interactionId}`;

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("trades")
      .update({
        discord_message_id:
          lock,

        updated_at:
          now,
      })
      .eq("id", tradeId)
      .eq(
        "status",
        "approved",
      )
      .not(
        "committee_approved_at",
        "is",
        null,
      )
      .is(
        "discord_message_id",
        null,
      )
      .select(TRADE_SELECT)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to lock trade publication: ${error.message}`,
    );
  }

  return {
    lock,

    trade:
      data
        ? (
            data as unknown as TradeRow
          )
        : null,
  };
}

async function releasePublishLock(
  tradeId: string,
  lock: string,
) {
  await supabaseAdmin
    .from("trades")
    .update({
      discord_message_id:
        null,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", tradeId)
    .eq(
      "discord_message_id",
      lock,
    );
}

async function finishPublication({
  tradeId,
  lock,
  message,
  imageUrl,
}: {
  tradeId: string;
  lock: string;
  message: DiscordMessage;
  imageUrl: string | null;
}) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("trades")
      .update({
        discord_message_id:
          message.id,

        discord_channel_id:
          message.channel_id,

        graphic_url:
          imageUrl,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", tradeId)
      .eq(
        "discord_message_id",
        lock,
      )
      .select(
        "id,discord_message_id",
      )
      .maybeSingle();

  if (
    error ||
    !data ||
    data.discord_message_id !==
      message.id
  ) {
    throw new Error(
      `Schefter posted, but publication state failed to save${error?.message ? `: ${error.message}` : "."}`,
    );
  }
}

async function handleTradeSummaryCommand(
  interaction: any,
) {
  const trades =
    await approvedUnpublishedTrades();

  if (!trades.length) {
    return ephemeral(
      "✅ There are no approved, unpublished trades waiting for Schefter.",
    );
  }

  return ephemeral(
    "**Select an approved trade to publish with Adam Schefter.**\nSelecting a trade publishes it immediately. Denied and already-published trades cannot appear here.",
    {
      components: [
        {
          type: 1,

          components: [
            {
              type: 3,

              custom_id:
                "trade_summary_select",

              placeholder:
                "Choose trade to publish",

              min_values: 1,
              max_values: 1,

              options:
                trades.map(
                  (trade) => ({
                    label:
                      clip(
                        tradeSummaryLabel(
                          trade,
                        ),
                        100,
                      ),

                    description:
                      selectDescription(
                        trade,
                      ),

                    value:
                      trade.id,
                  }),
                ),
            },
          ],
        },
      ],
    },
  );
}

async function handleTradeSummarySelection(
  interaction: any,
) {
  const tradeId =
    clean(
      interaction?.data
        ?.values?.[0],
    );

  if (!tradeId) {
    return updateMessage({
      content:
        "❌ No trade was selected.",

      embeds: [],

      components: [],

      allowed_mentions: {
        parse: [],
      },
    });
  }

  /*
   * Permanent behavior:
   * choosing the trade IS the publication action.
   * handlePublish keeps the existing authorization,
   * publication lock, renderer, Discord send, and DB finalization.
   */
  return handlePublish(
    interaction,
    tradeId,
  );
}

async function handlePublish(
  interaction: any,
  tradeId: string,
) {
  if (
    !(
      await tradeStaffAllowed(
        interaction,
      )
    )
  ) {
    return ephemeral(
      "⛔ Only authorized league staff can publish with Schefter.",
    );
  }

  const interactionId =
    clean(
      interaction?.id,
    );

  const {
    lock,
    trade,
  } =
    await lockTradeForPublishing(
      tradeId,
      interactionId ||
        Date.now().toString(),
    );

  if (!trade) {
    return updateMessage({
      content:
        "⛔ Publication blocked. This trade is denied, not committee-approved, already published, or currently being published.",

      embeds: [],
      components: [],
    });
  }

  try {
    const {
      message,
      imageUrl,
    } =
      await sendSchefterTradeAlert(
        trade,
      );

    try {
      await finishPublication({
        tradeId,
        lock,
        message,
        imageUrl,
      });
    } catch (stateError) {
      console.error(
        "Schefter posted but trade state did not finalize:",
        stateError,
      );

      return updateMessage({
        content:
          `⚠️ Schefter posted **${tradeSummaryLabel(trade)}**, but the database publication state needs attention. The lock was kept to prevent a duplicate.`,

        embeds: [],
        components: [],
      });
    }

    return updateMessage({
      content:
        `✅ **${tradeSummaryLabel(trade)}** was published by Adam Schefter in <#${message.channel_id}>.`,

      embeds: [],
      components: [],

      allowed_mentions: {
        parse: [],
      },
    });
  } catch (error) {
    await releasePublishLock(
      tradeId,
      lock,
    );

    throw error;
  }
}

export async function markTradeFormVerified({
  trade,
}: {
  trade: unknown;
}) {
  const row =
    trade as TradeRow;

  const channelId =
    row.approval_discord_channel_id;

  const messageId =
    row.approval_discord_message_id;

  if (
    !channelId ||
    !messageId
  ) {
    return;
  }

  const votes =
    await loadVotes(
      row.id,
    );

  await discordRequest(
    `/channels/${channelId}/messages/${messageId}`,
    {
      method: "PATCH",

      body: {
        content:
          "✅ **GOOGLE FORM VERIFIED — TRADE IS READY FOR `/trade-summary`.**",

        embeds: [
          approvalEmbed(
            row,
            votes,
          ),
          ...tradePlayerEmbeds(
            row,
          ),
        ],

        components: [],

        allowed_mentions: {
          parse: [],
        },
      },
    },
  );
}

export async function handleTradeWorkflowInteraction(
  interaction: any,
) {
  const commandName =
    clean(
      interaction?.data?.name,
    ).toLowerCase();

  const customId =
    clean(
      interaction?.data
        ?.custom_id,
    );

  if (
    commandName ===
    "trade-submit"
  ) {
    return handleTradeSubmitCommand(
      interaction,
    );
  }

  if (
    commandName ===
    "trade-summary"
  ) {
    return handleTradeSummaryCommand(
      interaction,
    );
  }

  if (
    customId.startsWith(
      "trade_vote_approve:",
    ) ||
    customId.startsWith(
      "trade_approve:",
    )
  ) {
    const prefix =
      customId.startsWith(
        "trade_vote_approve:",
      )
        ? "trade_vote_approve:"
        : "trade_approve:";

    return handleVote(
      interaction,
      customId.slice(
        prefix.length,
      ),
      "approve",
    );
  }

  if (
    customId.startsWith(
      "trade_vote_deny:",
    ) ||
    customId.startsWith(
      "trade_deny:",
    )
  ) {
    const prefix =
      customId.startsWith(
        "trade_vote_deny:",
      )
        ? "trade_vote_deny:"
        : "trade_deny:";

    return handleVote(
      interaction,
      customId.slice(
        prefix.length,
      ),
      "deny",
    );
  }

  if (
    customId ===
    "trade_summary_select"
  ) {
    return handleTradeSummarySelection(
      interaction,
    );
  }

  if (
    customId.startsWith(
      "trade_publish:",
    )
  ) {
    return handlePublish(
      interaction,
      customId.slice(
        "trade_publish:".length,
      ),
    );
  }

  if (
    customId ===
    "trade_cancel"
  ) {
    return updateMessage({
      content:
        "Publication canceled. Nothing was posted.",

      embeds: [],
      components: [],
    });
  }

  return ephemeral(
    "❌ Unknown trade workflow action.",
  );
}
