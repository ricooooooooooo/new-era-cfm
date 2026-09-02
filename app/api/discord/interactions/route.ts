import {
  after,
  NextRequest,
  NextResponse,
} from "next/server";

import nacl from "tweetnacl";
import { reconcileActiveCheckTargets } from "@/lib/active-check/targets";

import { handleGoldJacketDevShopCommand } from "@/lib/discord/devshop-command";
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

  if (interaction.data?.name === "devshop") {
    return handleGoldJacketDevShopCommand(interaction);
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
            result,
          );
        }
      }

      const isPublic =
        GOLD_JACKET_PUBLIC_COMMANDS.has(
          commandName,
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
              result,
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
            "⛔ This GOLD JACKET Active Check is closed.",

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
              "🏈 GOLD JACKET CFM Activity Check",

            description:
              currentEmbed
                ?.description ||
              "Click **I'm Active** below to confirm your activity.",

            color:
              currentEmbed
                ?.color ??
              0xd4af37,

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
                  "GOLD JACKET CFM • Commissioner Activity Center",
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
          "discord_id,team_slug,team_name,checked_in_at",
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

    const checkedInTeams =
      Array.from(
        new Map(
          (allClicksResult.data ?? [])
            .map(
              (row) => [
                row.team_slug,
                row.team_name ||
                  row.team_slug,
              ],
            ),
        ).values(),
      ).filter(Boolean);

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
