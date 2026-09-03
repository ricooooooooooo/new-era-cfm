import {
  after,
  NextRequest,
  NextResponse,
} from "next/server";

import nacl from "tweetnacl";
import { reconcileActiveCheckTargets } from "@/lib/active-check/targets";

import {
  handleGoldJacketDevShopCommand,
  handleGoldJacketDevShopPageInteraction,
} from "@/lib/discord/devshop-command";
import {
  handleGoldJacketCommand,
} from "@/lib/discord/intelligence-commands";

import {
  syncDiscordTeamAssignment,
} from "@/lib/discord-team-sync";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import {
  buildGoldJacketCreatorClaimComponents,
  parseGoldJacketCreatorClaimId,
} from "@/lib/gold-jackets/creator-claim.mjs";

import { canonicalizeActiveCheckClickRows } from "@/lib/active-check/display-core.mjs";
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

const RESPONSE_DEFERRED_UPDATE_MESSAGE =
  6;

const RESPONSE_UPDATE_MESSAGE =
  7;

const GOLD_JACKET_COMMANDS =
  new Set([
    "goldjacket",
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

const GOLD_JACKET_IMMEDIATE_COMMANDS =
  new Set([
    "goldjacket",
    "tutorial",
  ]);

const GOLD_JACKET_PUBLIC_COMMANDS =
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
 * 2. Run Gold Jacket intelligence.
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
          "⚠️ Gold Jacket did not return a command response.",
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
            "⚠️ Gold Jacket Intelligence couldn't finish that command. Try it again in a few seconds.",

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

function makeGoldJacketPublicResult(
  result: any,
) {
  if (
    !result ||
    typeof result !== "object" ||
    !result.data ||
    typeof result.data !== "object"
  ) {
    return result;
  }

  const data = {
    ...result.data,
  };

  delete data.flags;

  return {
    ...result,
    data,
  };
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
  // DEVSHOP_PAGE_BUTTON_ROUTING
  if (
    String(
      interaction.data?.custom_id ?? "",
    ).startsWith("devshop_page_")
  ) {
    return handleGoldJacketDevShopPageInteraction(
      interaction,
    );
  }

  // DEVSHOP_DEFERRED_ACK
  // /devshop performs Discord + Supabase + roster work.
  // Acknowledge immediately, then finish the existing handler after response.
  if (
    interaction.data?.name ===
    "devshop"
  ) {
    const applicationId =
      String(
        interaction.application_id ??
          "",
      ).trim();

    const interactionToken =
      String(
        interaction.token ?? "",
      ).trim();

    if (
      !applicationId ||
      !interactionToken
    ) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "❌ Dev Shop could not start because the Discord interaction token was missing.",
          flags: 64,
          allowed_mentions: {
            parse: [],
          },
        },
      });
    }

    after(async () => {
      let responseData:
        Record<string, unknown> = {
          content:
            "❌ The Gold Jacket Dev Shop could not finish loading.",
          allowed_mentions: {
            parse: [],
          },
        };

      try {
        const result =
          await handleGoldJacketDevShopCommand(
            interaction,
          );

        const payload =
          await result.json();

        if (
          payload &&
          typeof payload === "object" &&
          payload.data &&
          typeof payload.data ===
            "object"
        ) {
          responseData = {
            ...(
              payload.data as
                Record<
                  string,
                  unknown
                >
            ),
          };

          delete responseData.flags;
        }
      } catch (error) {
        console.error(
          "Deferred /devshop workflow failed:",
          error,
        );

        responseData = {
          content:
            "❌ The Gold Jacket Dev Shop couldn't load right now. Try again in a moment or open the website Dev Shop.",
          allowed_mentions: {
            parse: [],
          },
        };
      }

      try {
        const editResponse =
          await fetch(
            `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify(
                  responseData,
                ),
              cache: "no-store",
            },
          );

        if (!editResponse.ok) {
          const body =
            await editResponse.text();

          console.error(
            "Unable to edit deferred /devshop response:",
            editResponse.status,
            body.slice(0, 500),
          );
        }
      } catch (error) {
        console.error(
          "Deferred /devshop response edit failed:",
          error,
        );
      }
    });

    return NextResponse.json({
      type: 5,
      data: {},
    });
  }

  // TRADE_SUMMARY_COMMAND_DEFERRED_ACK
  // /trade-summary may read database state. ACK the slash command first,
  // then replace the deferred ephemeral response with the select menu.
  if (
    interaction.data?.name ===
      "trade-summary"
  ) {
    const applicationId =
      String(
        interaction.application_id ??
          "",
      ).trim();

    const interactionToken =
      String(
        interaction.token ??
          "",
      ).trim();

    if (
      !applicationId ||
      !interactionToken
    ) {
      return NextResponse.json({
        type:
          RESPONSE_CHANNEL_MESSAGE,

        data: {
          content:
            "❌ Trade summary could not start because the Discord interaction token was missing.",

          flags:
            64,

          allowed_mentions: {
            parse: [],
          },
        },
      });
    }

    after(
      async () => {
        let responseData:
          Record<
            string,
            unknown
          > = {
            content:
              "❌ Trade summary workflow could not finish.",

            embeds: [],

            components: [],

            allowed_mentions: {
              parse: [],
            },
          };

        try {
          const {
            handleTradeWorkflowInteraction,
          } =
            await import(
              "@/lib/discord/trade-workflow"
            );

          const result =
            await handleTradeWorkflowInteraction(
              interaction,
            );

          if (
            result?.data &&
            typeof result.data ===
              "object"
          ) {
            responseData = {
              ...(
                result.data as
                  Record<
                    string,
                    unknown
                  >
              ),
            };

            delete responseData.flags;
          }
        } catch (error) {
          console.error(
            "Deferred /trade-summary command failed:",
            error,
          );
        }

        try {
          const editResponse =
            await fetch(
              `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
              {
                method:
                  "PATCH",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    responseData,
                  ),

                cache:
                  "no-store",
              },
            );

          if (
            !editResponse.ok
          ) {
            console.error(
              "Unable to edit deferred /trade-summary response:",
              editResponse.status,
              (
                await editResponse.text()
              ).slice(
                0,
                500,
              ),
            );
          }
        } catch (error) {
          console.error(
            "Deferred /trade-summary response edit failed:",
            error,
          );
        }
      },
    );

    return NextResponse.json({
      type:
        RESPONSE_DEFERRED_CHANNEL_MESSAGE,

      data: {
        flags:
          64,
      },
    });
  }

  // TRADE_SUMMARY_SELECT_DIRECT_PUBLISH_ACK
  // Selecting a trade IS the publish action. ACK the component before
  // database/render/Discord work, then replace the original ephemeral
  // trade-summary response with success or failure after publication.
  if (
    interaction.type ===
      DISCORD_MESSAGE_COMPONENT &&
    String(
      interaction.data?.custom_id ??
        "",
    ) ===
      "trade_summary_select"
  ) {
    const applicationId =
      String(
        interaction.application_id ??
          "",
      ).trim();

    const interactionToken =
      String(
        interaction.token ??
          "",
      ).trim();

    if (
      !applicationId ||
      !interactionToken
    ) {
      return NextResponse.json({
        type:
          RESPONSE_UPDATE_MESSAGE,

        data: {
          content:
            "❌ Trade publication could not start because the Discord interaction token was missing.",

          embeds: [],

          components: [],

          allowed_mentions: {
            parse: [],
          },
        },
      });
    }

    after(
      async () => {
        let responseData:
          Record<
            string,
            unknown
          > = {
            content:
              "❌ Trade publication failed before Adam Schefter could post it.",

            embeds: [],

            components: [],

            allowed_mentions: {
              parse: [],
            },
          };

        try {
          const {
            handleTradeWorkflowInteraction,
          } =
            await import(
              "@/lib/discord/trade-workflow"
            );

          const result =
            await handleTradeWorkflowInteraction(
              interaction,
            );

          if (
            result?.data &&
            typeof result.data ===
              "object"
          ) {
            responseData = {
              ...(
                result.data as
                  Record<
                    string,
                    unknown
                  >
              ),
            };

            delete responseData.flags;
          }
        } catch (error) {
          console.error(
            "Direct trade-summary publication failed:",
            error,
          );
        }

        try {
          const editResponse =
            await fetch(
              `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
              {
                method:
                  "PATCH",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    responseData,
                  ),

                cache:
                  "no-store",
              },
            );

          if (
            !editResponse.ok
          ) {
            console.error(
              "Unable to edit direct trade-summary publish response:",
              editResponse.status,
              (
                await editResponse.text()
              ).slice(
                0,
                500,
              ),
            );
          }
        } catch (error) {
          console.error(
            "Direct trade-summary publish response edit failed:",
            error,
          );
        }
      },
    );

    return NextResponse.json({
      type:
        RESPONSE_DEFERRED_UPDATE_MESSAGE,
    });
  }

  // TRADE_PUBLISH_DEFERRED_ACK_V2
  // Publishing renders the Schefter image and uploads it to Discord.
  // The button itself must be ACKed immediately; the slow work follows.
  if (
    interaction.type ===
      DISCORD_MESSAGE_COMPONENT &&
    String(
      interaction.data?.custom_id ??
        "",
    ).startsWith(
      "trade_publish:",
    )
  ) {
    const applicationId =
      String(
        interaction.application_id ??
          "",
      ).trim();

    const interactionToken =
      String(
        interaction.token ??
          "",
      ).trim();

    if (
      !applicationId ||
      !interactionToken
    ) {
      return NextResponse.json({
        type:
          RESPONSE_CHANNEL_MESSAGE,

        data: {
          content:
            "❌ Schefter publication could not start because the Discord interaction token was missing.",

          flags:
            64,

          allowed_mentions: {
            parse: [],
          },
        },
      });
    }

    after(
      async () => {
        let responseData:
          Record<
            string,
            unknown
          > = {
            content:
              "❌ Schefter publication could not finish.",

            embeds: [],

            components: [],

            allowed_mentions: {
              parse: [],
            },
          };

        try {
          const {
            handleTradeWorkflowInteraction,
          } =
            await import(
              "@/lib/discord/trade-workflow"
            );

          const result =
            await handleTradeWorkflowInteraction(
              interaction,
            );

          if (
            result?.data &&
            typeof result.data ===
              "object"
          ) {
            responseData = {
              ...(
                result.data as
                  Record<
                    string,
                    unknown
                  >
              ),
            };

            delete responseData.flags;
          }
        } catch (error) {
          console.error(
            "Deferred Schefter publication failed:",
            error,
          );

          responseData = {
            content:
              "❌ Schefter publication failed. Nothing was marked published unless the Schefter post completed successfully.",

            embeds: [],

            components: [],

            allowed_mentions: {
              parse: [],
            },
          };
        }

        try {
          const editResponse =
            await fetch(
              `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
              {
                method:
                  "PATCH",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    responseData,
                  ),

                cache:
                  "no-store",
              },
            );

          if (
            !editResponse.ok
          ) {
            console.error(
              "Unable to edit deferred Schefter publication response:",
              editResponse.status,
              (
                await editResponse.text()
              ).slice(
                0,
                500,
              ),
            );
          }
        } catch (error) {
          console.error(
            "Deferred Schefter publication response edit failed:",
            error,
          );
        }
      },
    );

    return NextResponse.json({
      type:
        RESPONSE_DEFERRED_UPDATE_MESSAGE,
    });
  }

  // TRADE_SUBMIT_DEFERRED_ACK
  // Discord requires a fast initial acknowledgment. Trade creation +
  // committee posting happens after the deferred ephemeral response.
  if (
    interaction.data?.name ===
    "trade-submit"
  ) {
    const applicationId =
      String(
        interaction.application_id ??
          "",
      ).trim();

    const interactionToken =
      String(
        interaction.token ?? "",
      ).trim();

    if (
      !applicationId ||
      !interactionToken
    ) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "❌ Trade submission could not start because the Discord interaction token was missing.",
          flags: 64,
          allowed_mentions: {
            parse: [],
          },
        },
      });
    }

    after(async () => {
      let responseData:
        Record<string, unknown> = {
          content:
            "❌ The trade submission failed unexpectedly. Check the trade queue before submitting again.",
          allowed_mentions: {
            parse: [],
          },
        };

      try {
        const {
          handleTradeWorkflowInteraction,
        } = await import(
          "@/lib/discord/trade-workflow"
        );

        const tradeResult =
          await handleTradeWorkflowInteraction(
            interaction,
          );

        const tradeData:
          Record<string, unknown> =
          tradeResult &&
          typeof tradeResult ===
            "object" &&
          "data" in tradeResult &&
          tradeResult.data &&
          typeof tradeResult.data ===
            "object"
            ? {
                ...(
                  tradeResult.data as
                    Record<
                      string,
                      unknown
                    >
                ),
              }
            : {
                content:
                  "✅ Trade submission finished.",
                allowed_mentions: {
                  parse: [],
                },
              };

        delete tradeData.flags;
        responseData = tradeData;
      } catch (error) {
        console.error(
          "Deferred trade-submit workflow failed:",
          error,
        );

        responseData = {
          content:
            "❌ Trade submission failed before it could be sent to the Trade Committee. A commissioner can check the server logs for the exact error.",
          allowed_mentions: {
            parse: [],
          },
        };
      }

      try {
        const editResponse =
          await fetch(
            `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify(
                  responseData,
                ),
              cache: "no-store",
            },
          );

        if (!editResponse.ok) {
          const body =
            await editResponse.text();

          console.error(
            "Unable to edit deferred trade-submit response:",
            editResponse.status,
            body.slice(0, 500),
          );
        }
      } catch (error) {
        console.error(
          "Deferred trade-submit response edit failed:",
          error,
        );
      }
    });

    return NextResponse.json({
      type: 5,
      data: {
        flags: 64,
      },
    });
  }

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
   * GOLD JACKET APPROVED-TRADE WORKFLOW.
   *
   * Kept outside the general intelligence command dispatcher because
   * this command has database state + Discord component interactions.
   */
  const tradeCustomId =
    String(
      interaction.data?.custom_id ??
        "",
    );

  if (
    (
      tradeCustomId.startsWith(
        "trade_",
      ) &&
      tradeCustomId !==
        "trade_summary_select" &&
      !tradeCustomId.startsWith(
        "trade_publish:",
      )
    )
  ) {
    const {
      handleTradeWorkflowInteraction,
    } = await import(
      "@/lib/discord/trade-workflow"
    );

    const tradeResult =
      await handleTradeWorkflowInteraction(
        interaction,
      );

    return NextResponse.json(
      tradeResult,
    );
  }


  /*
   * GOLD JACKET SLASH / CONTEXT COMMANDS.
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
      GOLD_JACKET_COMMANDS.has(
        commandName,
      )
    ) {
      /*
       * Tiny commands don't need deferred execution.
       */
      if (
        GOLD_JACKET_IMMEDIATE_COMMANDS.has(
          commandName,
        )
      ) {
        const result =
          await handleGoldJacketCommand(
            interaction,
          );

        if (result) {
          return NextResponse.json(
              makeGoldJacketPublicResult(
                result,
              ),
            );
        }
      }

      const isPublic =
        !commandName.startsWith(
          "trade-",
        );

      after(
        async () => {
          try {
            const result =
              await handleGoldJacketCommand(
                interaction,
              );

            if (!result) {
              throw new Error(
                `No response generated for ${commandName}`,
              );
            }

            await editDeferredResponse(
                interaction,
                makeGoldJacketPublicResult(
                  result,
                ),
              );
          } catch (error) {
            console.error(
              `Deferred Gold Jacket /${commandName} failed:`,
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
   * GOLD JACKET MISH CREATOR CLAIM.
   *
   * First mish to click the green button
   * permanently receives the build.
   */
  const goldJacketCreatorClaimId =
    parseGoldJacketCreatorClaimId(
      interaction.data
        ?.custom_id,
    );

  if (
    interaction.type ===
      DISCORD_MESSAGE_COMPONENT &&
    goldJacketCreatorClaimId
  ) {
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
      "Mish";

    if (!userId) {
      return NextResponse.json({
        type:
          RESPONSE_CHANNEL_MESSAGE,

        data: {
          content:
            "❌ Your Discord account could not be identified.",

          flags: 64,
        },
      });
    }

    /*
     * Atomic first-click-wins.
     *
     * This UPDATE can only affect the row
     * while creator_discord_id is NULL.
     */
    const {
      data: creatorClaim,
      error: creatorClaimError,
    } =
      await supabaseAdmin
        .from(
          "gold_jacket_claims",
        )
        .update({
          creator_discord_id:
            userId,

          creator_display_name:
            displayName,

          creator_claimed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          goldJacketCreatorClaimId,
        )
        .is(
          "creator_discord_id",
          null,
        )
        .select(
          "id, creator_discord_id, creator_display_name, creator_claimed_at",
        )
        .maybeSingle();

    if (creatorClaimError) {
      console.error(
        "Unable to claim Gold Jacket creation task:",
        creatorClaimError,
      );

      return NextResponse.json({
        type:
          RESPONSE_CHANNEL_MESSAGE,

        data: {
          content:
            "❌ Unable to claim this Gold Jacket build right now.",

          flags: 64,
        },
      });
    }

    if (!creatorClaim) {
      const {
        data: existingCreator,
        error: existingCreatorError,
      } =
        await supabaseAdmin
          .from(
            "gold_jacket_claims",
          )
          .select(
            "creator_discord_id, creator_display_name",
          )
          .eq(
            "id",
            goldJacketCreatorClaimId,
          )
          .maybeSingle();

      if (existingCreatorError) {
        console.error(
          "Unable to read Gold Jacket creator assignment:",
          existingCreatorError,
        );

        return NextResponse.json({
          type:
            RESPONSE_CHANNEL_MESSAGE,

          data: {
            content:
              "❌ Unable to verify who claimed this build.",

            flags: 64,
          },
        });
      }

      if (!existingCreator) {
        return NextResponse.json({
          type:
            RESPONSE_CHANNEL_MESSAGE,

          data: {
            content:
              "❌ This Gold Jacket build no longer exists.",

            flags: 64,
          },
        });
      }

      if (
        existingCreator
          .creator_discord_id ===
        userId
      ) {
        return NextResponse.json({
          type:
            RESPONSE_CHANNEL_MESSAGE,

          data: {
            content:
              "✅ You already claimed this Gold Jacket build.",

            flags: 64,
          },
        });
      }

      const claimedBy =
        existingCreator
          .creator_discord_id
          ? `<@${existingCreator.creator_discord_id}>`
          : existingCreator
              .creator_display_name ||
            "another mish";

      return NextResponse.json({
        type:
          RESPONSE_CHANNEL_MESSAGE,

        data: {
          content:
            `✅ This Gold Jacket build is already claimed by ${claimedBy}.`,

          flags: 64,

          allowed_mentions: {
            parse: [],
          },
        },
      });
    }

    const currentEmbed =
      interaction.message
        ?.embeds?.[0];

    if (!currentEmbed) {
      return NextResponse.json({
        type:
          RESPONSE_CHANNEL_MESSAGE,

        data: {
          content:
            "✅ Build claimed. Discord could not refresh the card.",

          flags: 64,
        },
      });
    }

    const currentFields =
      Array.isArray(
        currentEmbed.fields,
      )
        ? currentEmbed.fields.filter(
            (
              field: {
                name?: string;
              },
            ) =>
              field.name !==
              "✅ CLAIMED BY",
          )
        : [];

    const updatedEmbed = {
      title:
        currentEmbed.title,

      description:
        currentEmbed.description,

      color:
        currentEmbed.color,

      thumbnail:
        currentEmbed
          .thumbnail?.url
          ? {
              url:
                currentEmbed
                  .thumbnail
                  .url,
            }
          : undefined,

      fields: [
        ...currentFields,

        {
          name:
            "✅ CLAIMED BY",

          value:
            `<@${userId}> • **${displayName}** is making this player.`,

          inline: false,
        },
      ],

      footer:
        currentEmbed
          .footer?.text
          ? {
              text:
                currentEmbed
                  .footer
                  .text,
            }
          : undefined,

      timestamp:
        currentEmbed.timestamp ||
        new Date()
          .toISOString(),
    };

    return NextResponse.json({
      type:
        RESPONSE_UPDATE_MESSAGE,

      data: {
        content:
          interaction.message
            ?.content ||
          "",

        allowed_mentions: {
          parse: [],
        },

        embeds: [
          updatedEmbed,
        ],

        components:
          buildGoldJacketCreatorClaimComponents(
            goldJacketCreatorClaimId,
            displayName,
          ),
      },
    });
  }

  /*
   * EXISTING ACTIVE CHECK.
   */
  if (
    interaction.type === DISCORD_MESSAGE_COMPONENT &&
    interaction.data?.custom_id === "active_check_join"
  ) {
    const discordUser =
      interaction.member?.user ??
      interaction.user;

    const userId =
      discordUser?.id?.trim();

    const liveDisplayName =
      interaction.member?.nick ||
      interaction.member?.user?.global_name ||
      discordUser?.global_name ||
      discordUser?.username ||
      "Unknown User";

    const ephemeral =
      (content: string) =>
        NextResponse.json({
          type:
            RESPONSE_CHANNEL_MESSAGE,
          data: {
            content,
            flags: 64,
            allowed_mentions: {
              parse: [],
            },
          },
        });

    if (!userId) {
      return ephemeral(
        "Your Discord account could not be identified. Please try again.",
      );
    }

    const activeCheckId =
      interaction.message?.id?.trim();

    if (!activeCheckId) {
      return ephemeral(
        "This Active Check could not be identified.",
      );
    }

    const checkResult =
      await supabaseAdmin
        .from(
          "league_health_active_checks",
        )
        .select(
          "active_check_id,status,closes_at",
        )
        .eq(
          "active_check_id",
          activeCheckId,
        )
        .maybeSingle();

    if (checkResult.error) {
      console.error(
        "Unable to verify Active Check status:",
        checkResult.error,
      );

      return ephemeral(
        "The Active Check could not be verified. Please try again.",
      );
    }

    const check =
      checkResult.data;

    const closesAt =
      check?.closes_at
        ? new Date(
            check.closes_at,
          ).getTime()
        : null;

    if (
      !check ||
      check.status !== "open" ||
      (
        closesAt !== null &&
        Number.isFinite(
          closesAt,
        ) &&
        closesAt <= Date.now()
      )
    ) {
      return ephemeral(
        "This Active Check is closed.",
      );
    }

    /*
     * Eligibility can have TWO rows for the same franchise
     * because a main owner + substitute may both hold @Jets.
     */
    const loadActiveCheckTarget =
      async () =>
        supabaseAdmin
          .from(
            "active_check_targets",
          )
          .select(
            "team_slug,team_abbreviation,team_name,member_id,discord_id,display_name",
          )
          .eq(
            "active_check_id",
            activeCheckId,
          )
          .eq(
            "discord_id",
            userId,
          );

    let targetResult =
      await loadActiveCheckTarget();

    if (targetResult.error) {
      console.error(
        "Unable to resolve Active Check eligibility:",
        targetResult.error,
      );

      return ephemeral(
        "Your Active Check eligibility could not be verified. Please try again.",
      );
    }

    let targets =
      targetResult.data ?? [];

    if (targets.length === 0) {
      try {
        await reconcileActiveCheckTargets(
          activeCheckId,
        );
      } catch (error) {
        console.error(
          "Active Check click-time team-role reconciliation failed:",
          error,
        );

        return ephemeral(
          "Your current team role could not be refreshed. Please try the button again in a moment.",
        );
      }

      targetResult =
        await loadActiveCheckTarget();

      if (targetResult.error) {
        console.error(
          "Unable to resolve refreshed Active Check eligibility:",
          targetResult.error,
        );

        return ephemeral(
          "Your refreshed Active Check eligibility could not be verified. Please try again.",
        );
      }

      targets =
        targetResult.data ?? [];
    }

    const teamSlugs =
      [
        ...new Set(
          targets.map(
            (target) =>
              target.team_slug,
          ),
        ),
      ];

    if (teamSlugs.length === 0) {
      return ephemeral(
        "You are not one of the owners targeted by this Active Check. If that looks wrong, contact a commissioner.",
      );
    }

    if (teamSlugs.length > 1) {
      return ephemeral(
        "You currently have multiple different NFL team roles. A commissioner needs to remove the extra role before the Active Check can tell which franchise you represent.",
      );
    }

    const target =
      targets.find(
        (row) =>
          row.team_slug ===
          teamSlugs[0],
      );

    if (!target) {
      return ephemeral(
        "Your Active Check team could not be resolved. Please try again.",
      );
    }

    /* One successful click satisfies the FRANCHISE. */
    const existingResult =
      await supabaseAdmin
        .from(
          "active_check_clicks",
        )
        .select(
          "id,discord_id,display_name,team_slug,team_name",
        )
        .eq(
          "active_check_id",
          activeCheckId,
        )
        .eq(
          "team_slug",
          target.team_slug,
        )
        .maybeSingle();

    if (existingResult.error) {
      console.error(
        "Unable to verify existing Active Check team response:",
        existingResult.error,
      );

      return ephemeral(
        "Your team's existing response could not be verified. Please try again.",
      );
    }

    if (existingResult.data) {
      return ephemeral(
        `✅ The **${target.team_name}** are already checked in.`,
      );
    }

    const saveResult =
      await supabaseAdmin
        .from(
          "active_check_clicks",
        )
        .insert({
          discord_id:
            userId,
          display_name:
            target.display_name ||
            liveDisplayName,
          team_slug:
            target.team_slug,
          team_abbreviation:
            target.team_abbreviation,
          team_name:
            target.team_name,
          active_check_id:
            activeCheckId,
          checked_in_at:
            new Date()
              .toISOString(),
        });

    if (saveResult.error) {
      /* Two valid holders may click at the same instant. */
      if (saveResult.error.code === "23505") {
        const raceResult =
          await supabaseAdmin
            .from(
              "active_check_clicks",
            )
            .select("id")
            .eq(
              "active_check_id",
              activeCheckId,
            )
            .eq(
              "team_slug",
              target.team_slug,
            )
            .maybeSingle();

        if (!raceResult.error && raceResult.data) {
          return ephemeral(
            `✅ The **${target.team_name}** are already checked in.`,
          );
        }
      }

      console.error(
        "Unable to save Active Check team response:",
        saveResult.error,
      );

      return ephemeral(
        "Your team's response could not be saved. Please try again.",
      );
    }

    const allClicksResult =
      await supabaseAdmin
        .from(
          "active_check_clicks",
        )
        .select(
          "discord_id,team_slug,team_name,team_abbreviation,checked_in_at",
        )
        .eq(
          "active_check_id",
          activeCheckId,
        )
        .order(
          "checked_in_at",
          { ascending: true },
        );

    if (allClicksResult.error) {
      console.error(
        "Unable to reload Active Check responses:",
        allClicksResult.error,
      );

      return ephemeral(
        `✅ The **${target.team_name}** are checked in.`,
      );
    }

    const allTargetsResult =
      await supabaseAdmin
        .from("active_check_targets")
        .select(
          "team_slug,team_name,team_abbreviation",
        )
        .eq(
          "active_check_id",
          activeCheckId,
        );

    if (allTargetsResult.error) {
      console.error(
        "Unable to reload Active Check target franchises:",
        allTargetsResult.error,
      );

      return ephemeral(
        "✅ Your team is checked in. The message display will refresh shortly.",
      );
    }

    const checkedInTeams =
      canonicalizeActiveCheckClickRows(
        allClicksResult.data ?? [],
        allTargetsResult.data ?? [],
      ).map(
        (team) =>
          team.teamName,
      );

    const currentEmbed =
      interaction.message?.embeds?.[0];

    const existingFields =
      Array.isArray(currentEmbed?.fields)
        ? currentEmbed.fields.filter(
            (field: { name?: string }) =>
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
          interaction.message?.content ||
          "@everyone",
        allowed_mentions: {
          parse: [],
        },
        embeds: [
          {
            title:
              currentEmbed?.title ||
              "🏆 GOLD JACKET Active Check",
            description:
              currentEmbed?.description ||
              "Click **I'm Active** below to confirm your activity.",
            color:
              currentEmbed?.color ??
              0xd4af37,
            fields: [
              ...existingFields,
              {
                name:
                  `✅ Teams Checked In — ${checkedInTeams.length}`,
                value:
                  checkedInTeams.length > 0
                    ? checkedInTeams
                        .map(
                          (team) =>
                            `✅ ${team}`,
                        )
                        .join("\n")
                    : "No teams have checked in yet.",
              },
            ],
            footer:
              currentEmbed?.footer || {
                text:
                  "GOLD JACKET CFM • Commissioner Activity Center",
              },
            timestamp:
              currentEmbed?.timestamp ||
              new Date().toISOString(),
            thumbnail:
              currentEmbed?.thumbnail,
            image:
              currentEmbed?.image,
            author:
              currentEmbed?.author,
          },
        ],
        components:
          interaction.message?.components ||
          [],
      },
    });
  }

  return NextResponse.json({
    type:
      RESPONSE_CHANNEL_MESSAGE,

    data: {
      content:
        "That Gold Jacket interaction is not currently supported.",

      flags: 64,
    },
  });
}
