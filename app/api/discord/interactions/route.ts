import {
  after,
  NextRequest,
  NextResponse,
} from "next/server";

import nacl from "tweetnacl";

import {
  handleNewEraCommand,
} from "@/lib/discord/intelligence-commands";

import {
  syncDiscordTeamAssignment,
} from "@/lib/discord-team-sync";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const runtime =
  "nodejs";

export const maxDuration =
  60;

const DISCORD_PING = 1;

const DISCORD_APPLICATION_COMMAND =
  2;

const DISCORD_MESSAGE_COMPONENT =
  3;

const RESPONSE_PONG = 1;

const RESPONSE_CHANNEL_MESSAGE =
  4;

const RESPONSE_DEFERRED_CHANNEL_MESSAGE =
  5;

const RESPONSE_UPDATE_MESSAGE =
  7;

const NEW_ERA_COMMANDS =
  new Set([
    "newera",
    "tutorial",
    "scout",
    "dna",
    "wrapped",
    "rivalry",
    "achievements",
    "belt",
    "fraud",
    "recaps",
    "scout owner",
  ]);

const NEW_ERA_IMMEDIATE_COMMANDS =
  new Set([
    "newera",
    "tutorial",
  ]);

const NEW_ERA_PUBLIC_COMMANDS =
  new Set([
    "belt",
    "fraud",
    "recaps",
  ]);

const EMPTY_CHECK_IN_MESSAGES =
  new Set([
    "no one has checked in yet.",
    "no owners have checked in yet.",
    "no teams have checked in yet.",
  ]);

function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
) {
  const publicKey =
    process.env
      .DISCORD_PUBLIC_KEY;

  if (
    !publicKey ||
    !signature ||
    !timestamp
  ) {
    return false;
  }

  try {
    return nacl.sign.detached.verify(
      Buffer.from(
        timestamp +
        rawBody,
      ),

      Buffer.from(
        signature,
        "hex",
      ),

      Buffer.from(
        publicKey,
        "hex",
      ),
    );
  } catch (error) {
    console.error(
      "Discord signature verification failed:",
      error,
    );

    return false;
  }
}

function parseCheckedInNames(
  value:
    string |
    undefined,
) {
  if (!value) {
    return [];
  }

  return value
    .split("\n")
    .map(
      (line) =>
        line.trim(),
    )
    .filter(
      (line) => {
        if (!line) {
          return false;
        }

        if (
          EMPTY_CHECK_IN_MESSAGES.has(
            line.toLowerCase(),
          )
        ) {
          return false;
        }

        return line.startsWith(
          "✅",
        );
      },
    )
    .map(
      (line) =>
        line
          .replace(
            /^✅\s*/,
            "",
          )
          .trim(),
    )
    .filter(Boolean);
}

async function activeCheckIsClosed(
  activeCheckId: string,
) {
  const result =
    await supabaseAdmin
      .from(
        "league_health_active_checks",
      )
      .select(
        "status, closes_at",
      )
      .eq(
        "active_check_id",
        activeCheckId,
      )
      .maybeSingle();

  if (result.error) {
    console.error(
      "Unable to verify active-check deadline:",
      result.error,
    );

    return false;
  }

  if (!result.data) {
    return false;
  }

  if (
    result.data.status ===
    "closed"
  ) {
    return true;
  }

  return Boolean(
    result.data.closes_at &&
    new Date(
      result.data.closes_at,
    ).getTime() <=
      Date.now(),
  );
}

/*
 * Discord heavy command flow:
 *
 * 1. ACK immediately.
 * 2. Run New Era intelligence.
 * 3. Replace Discord's loading response.
 */
async function editDeferredResponse(
  interaction: any,
  commandResponse: any,
) {
  const applicationId =
    interaction.application_id;

  const token =
    interaction.token;

  if (
    !applicationId ||
    !token
  ) {
    throw new Error(
      "Discord interaction is missing application_id/token.",
    );
  }

  const data = {
    ...(
      commandResponse
        ?.data ??
      {
        content:
          "⚠️ New Era did not return a command response.",
      }
    ),
  };

  /*
   * Ephemeral/public visibility is determined
   * during the initial deferred response.
   */
  delete data.flags;

  const response =
    await fetch(
      `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`,
      {
        method:
          "PATCH",

        headers: {
          "content-type":
            "application/json",
        },

        body:
          JSON.stringify(
            data,
          ),

        cache:
          "no-store",
      },
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Discord edit failed ${response.status}: ${body.slice(
        0,
        500,
      )}`,
    );
  }
}

async function sendDeferredError(
  interaction: any,
) {
  try {
    await editDeferredResponse(
      interaction,
      {
        data: {
          content:
            "⚠️ New Era Intelligence couldn't finish that command. Try it again in a few seconds.",

          allowed_mentions: {
            parse: [],
          },
        },
      },
    );
  } catch (error) {
    console.error(
      "Unable to update failed Discord interaction:",
      error,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  const signature =
    request.headers.get(
      "x-signature-ed25519",
    );

  const timestamp =
    request.headers.get(
      "x-signature-timestamp",
    );

  const rawBody =
    await request.text();

  if (
    !verifyDiscordRequest(
      rawBody,
      signature,
      timestamp,
    )
  ) {
    return new NextResponse(
      "Invalid request signature",
      {
        status: 401,
      },
    );
  }

  let interaction: any;

  try {
    interaction =
      JSON.parse(
        rawBody,
      );
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid JSON body.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * Discord verification ping.
   */
  if (
    interaction.type ===
    DISCORD_PING
  ) {
    return NextResponse.json({
      type:
        RESPONSE_PONG,
    });
  }

  /*
   * NEW ERA SLASH / CONTEXT COMMANDS.
   */
  if (
    interaction.type ===
    DISCORD_APPLICATION_COMMAND
  ) {
    const commandName =
      String(
        interaction.data?.name ??
          "",
      )
        .trim()
        .toLowerCase();

    if (
      NEW_ERA_COMMANDS.has(
        commandName,
      )
    ) {
      /*
       * Tiny commands don't need deferred execution.
       */
      if (
        NEW_ERA_IMMEDIATE_COMMANDS.has(
          commandName,
        )
      ) {
        const result =
          await handleNewEraCommand(
            interaction,
          );

        if (result) {
          return NextResponse.json(
            result,
          );
        }
      }

      const isPublic =
        NEW_ERA_PUBLIC_COMMANDS.has(
          commandName,
        );

      after(
        async () => {
          try {
            const result =
              await handleNewEraCommand(
                interaction,
              );

            if (!result) {
              throw new Error(
                `No response generated for ${commandName}`,
              );
            }

            await editDeferredResponse(
              interaction,
              result,
            );
          } catch (error) {
            console.error(
              `Deferred New Era /${commandName} failed:`,
              error,
            );

            await sendDeferredError(
              interaction,
            );
          }
        },
      );

      return NextResponse.json({
        type:
          RESPONSE_DEFERRED_CHANNEL_MESSAGE,

        data:
          isPublic
            ? {}
            : {
                flags: 64,
              },
      });
    }
  }

  /*
   * EXISTING ACTIVE CHECK.
   */
  if (
    interaction.type ===
      DISCORD_MESSAGE_COMPONENT &&
    interaction.data
      ?.custom_id ===
      "active_check_join"
  ) {
    const activeCheckId =
      interaction.message
        ?.id ??
      interaction.message
        ?.interaction_metadata
        ?.id ??
      "default";

    if (
      await activeCheckIsClosed(
        activeCheckId,
      )
    ) {
      return NextResponse.json({
        type:
          RESPONSE_CHANNEL_MESSAGE,

        data: {
          content:
            "⛔ This NEW ERA Active Check is closed.",

          flags: 64,
        },
      });
    }

    const discordUser =
      interaction.member
        ?.user ??
      interaction.user;

    const userId =
      discordUser?.id;

    const displayName =
      interaction.member
        ?.nick ||
      interaction.member
        ?.user
        ?.global_name ||
      discordUser
        ?.global_name ||
      discordUser
        ?.username ||
      "Unknown User";

    if (!userId) {
      return NextResponse.json({
        type:
          RESPONSE_CHANNEL_MESSAGE,

        data: {
          content:
            "Your Discord account could not be identified. Please try again.",

          flags: 64,
        },
      });
    }

    const teamSync =
      await syncDiscordTeamAssignment(
        userId,
      );

    if (!teamSync.team) {
      return NextResponse.json({
        type:
          RESPONSE_CHANNEL_MESSAGE,

        data: {
          content:
            "You don't currently have an NFL team role. Contact a commissioner.",

          flags: 64,
        },
      });
    }

    const teamSlug =
      teamSync.team;

    const prettyTeam =
      teamSync.roleNames.find(
        (roleName) =>
          roleName
            .toLowerCase()
            .includes(
              teamSlug,
            ),
      ) ??
      teamSlug
        .split("-")
        .map(
          (word) =>
            word
              .charAt(0)
              .toUpperCase() +
            word.slice(1),
        )
        .join(" ");

    const currentEmbed =
      interaction.message
        ?.embeds?.[0];

    const checkedInField =
      currentEmbed
        ?.fields
        ?.find(
          (
            field: {
              name?: string;
            },
          ) =>
            field.name?.includes(
              "Checked In",
            ),
        );

    const checkedInTeams =
      parseCheckedInNames(
        checkedInField
          ?.value,
      );

    const alreadyCheckedIn =
      checkedInTeams.some(
        (team) =>
          team.toLowerCase() ===
          prettyTeam.toLowerCase(),
      );

    if (
      alreadyCheckedIn
    ) {
      return NextResponse.json({
        type:
          RESPONSE_CHANNEL_MESSAGE,

        data: {
          content:
            `✅ **${displayName}**, your team already checked in.`,

          flags: 64,
        },
      });
    }

    const {
      error,
    } =
      await supabaseAdmin
        .from(
          "active_check_clicks",
        )
        .upsert(
          {
            discord_id:
              userId,

            display_name:
              displayName,

            team_slug:
              teamSlug,

            team_name:
              prettyTeam,

            active_check_id:
              activeCheckId,

            checked_in_at:
              new Date()
                .toISOString(),
          },

          {
            onConflict:
              "active_check_id,team_slug",
          },
        );

    if (error) {
      console.error(
        "Unable to save active check response:",
        error,
      );

      return NextResponse.json({
        type:
          RESPONSE_CHANNEL_MESSAGE,

        data: {
          content:
            "Your response could not be saved. Please try again.",

          flags: 64,
        },
      });
    }

    const updatedCheckedInTeams =
      [
        ...checkedInTeams,
        prettyTeam,
      ];

    const checkedInValue =
      updatedCheckedInTeams
        .map(
          (team) =>
            `✅ ${team}`,
        )
        .join("\n");

    const existingFields =
      Array.isArray(
        currentEmbed
          ?.fields,
      )
        ? currentEmbed.fields.filter(
            (
              field: {
                name?: string;
              },
            ) =>
              !field.name?.includes(
                "Checked In",
              ),
          )
        : [];

    return NextResponse.json({
      type:
        RESPONSE_UPDATE_MESSAGE,

      data: {
        content:
          interaction.message
            ?.content ||
          "@everyone",

        allowed_mentions: {
          parse: [],
        },

        embeds: [
          {
            title:
              currentEmbed
                ?.title ||
              "🏈 NEW ERA CFM Activity Check",

            description:
              currentEmbed
                ?.description ||
              "Click **I'm Active** below to confirm your activity.",

            color:
              currentEmbed
                ?.color ??
              0x7c3aed,

            fields: [
              ...existingFields,

              {
                name:
                  `🏈 Teams Checked In — ${updatedCheckedInTeams.length}`,

                value:
                  checkedInValue,
              },
            ],

            footer:
              currentEmbed
                ?.footer ||
              {
                text:
                  "NEW ERA CFM • Commissioner Activity Center",
              },

            timestamp:
              currentEmbed
                ?.timestamp ||
              new Date()
                .toISOString(),

            thumbnail:
              currentEmbed
                ?.thumbnail,

            image:
              currentEmbed
                ?.image,

            author:
              currentEmbed
                ?.author,
          },
        ],

        components:
          interaction.message
            ?.components ||
          [],
      },
    });
  }

  return NextResponse.json({
    type:
      RESPONSE_CHANNEL_MESSAGE,

    data: {
      content:
        "That New Era interaction is not currently supported.",

      flags: 64,
    },
  });
}
