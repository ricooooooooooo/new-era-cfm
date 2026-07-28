import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncDiscordTeamAssignment } from "@/lib/discord-team-sync";
import { NextRequest, NextResponse } from "next/server";
import nacl from "tweetnacl";

export const runtime = "nodejs";

const DISCORD_PING = 1;
const DISCORD_MESSAGE_COMPONENT = 3;

const RESPONSE_PONG = 1;
const RESPONSE_CHANNEL_MESSAGE = 4;
const RESPONSE_UPDATE_MESSAGE = 7;

const EMPTY_CHECK_IN_MESSAGES = new Set([
  "no one has checked in yet.",
  "no owners have checked in yet.",
  "no teams have checked in yet.",
]);

function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!publicKey || !signature || !timestamp) {
    return false;
  }

  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(publicKey, "hex"),
    );
  } catch (error) {
    console.error("Discord signature verification failed:", error);
    return false;
  }
}

function parseCheckedInNames(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) {
        return false;
      }

      if (EMPTY_CHECK_IN_MESSAGES.has(line.toLowerCase())) {
        return false;
      }

      return line.startsWith("✅");
    })
    .map((line) => line.replace(/^✅\s*/, "").trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const rawBody = await request.text();

  const validRequest = verifyDiscordRequest(
    rawBody,
    signature,
    timestamp,
  );

  if (!validRequest) {
    return new NextResponse("Invalid request signature", {
      status: 401,
    });
  }

  let interaction;

  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
      },
      {
        status: 400,
      },
    );
  }

  if (interaction.type === DISCORD_PING) {
    return NextResponse.json({
      type: RESPONSE_PONG,
    });
  }

  if (
    interaction.type === DISCORD_MESSAGE_COMPONENT &&
    interaction.data?.custom_id === "active_check_join"
  ) {
    const discordUser =
      interaction.member?.user ?? interaction.user;

    const userId = discordUser?.id;

    const displayName =
      interaction.member?.nick ||
      interaction.member?.user?.global_name ||
      discordUser?.global_name ||
      discordUser?.username ||
      "Unknown User";

    if (!userId) {
      return NextResponse.json({
        type: RESPONSE_CHANNEL_MESSAGE,
        data: {
          content:
            "Your Discord account could not be identified. Please try again.",
          flags: 64,
        },
      });
    }

    const teamSync = await syncDiscordTeamAssignment(userId);

    if (!teamSync.team) {
      return NextResponse.json({
        type: RESPONSE_CHANNEL_MESSAGE,
        data: {
          content:
            "You don't currently have an NFL team role. Contact a commissioner.",
          flags: 64,
        },
      });
    }

    const teamSlug = teamSync.team;

    const prettyTeam =
      teamSync.roleNames.find((roleName) =>
        roleName.toLowerCase().includes(teamSlug),
      ) ??
      teamSlug
        .split("-")
        .map(
          (word) =>
            word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(" ");

    const currentEmbed = interaction.message?.embeds?.[0];

    const checkedInField = currentEmbed?.fields?.find(
      (field: { name?: string }) =>
        field.name?.includes("Checked In"),
    );

    const checkedInTeams = parseCheckedInNames(
      checkedInField?.value,
    );

    const activeCheckId =
      interaction.message?.id ??
      interaction.message?.interaction_metadata?.id ??
      "default";

    const alreadyCheckedIn = checkedInTeams.some(
      (team) =>
        team.toLowerCase() === prettyTeam.toLowerCase(),
    );

    if (alreadyCheckedIn) {
      return NextResponse.json({
        type: RESPONSE_CHANNEL_MESSAGE,
        data: {
          content: `✅ **${displayName}**, your team already checked in.`,
          flags: 64,
        },
      });
    }

    const { error } = await supabaseAdmin
      .from("active_check_clicks")
      .upsert(
        {
          discord_id: userId,
          display_name: displayName,
          team_slug: teamSlug,
          team_name: prettyTeam,
          active_check_id: activeCheckId,
          checked_in_at: new Date().toISOString(),
        },
        {
          onConflict: "active_check_id,team_slug",
        },
      );

    if (error) {
      console.error(
        "Unable to save active check response:",
        error,
      );

      return NextResponse.json({
        type: RESPONSE_CHANNEL_MESSAGE,
        data: {
          content:
            "Your response could not be saved. Please try again.",
          flags: 64,
        },
      });
    }

    const updatedCheckedInTeams = [
      ...checkedInTeams,
      prettyTeam,
    ];

    const checkedInValue = updatedCheckedInTeams
      .map((team) => `✅ ${team}`)
      .join("\n");

    const existingFields = Array.isArray(
      currentEmbed?.fields,
    )
      ? currentEmbed.fields.filter(
          (field: { name?: string }) =>
            !field.name?.includes("Checked In"),
        )
      : [];

    return NextResponse.json({
      type: RESPONSE_UPDATE_MESSAGE,
      data: {
        content:
          interaction.message?.content || "@everyone",

        allowed_mentions: {
          parse: [],
        },

        embeds: [
          {
            title:
              currentEmbed?.title ||
              "🏈 NEW ERA CFM Activity Check",

            description:
              currentEmbed?.description ||
              "Click **I'm Active** below to confirm your activity.",

            color:
              currentEmbed?.color ??
              0x7c3aed,

            fields: [
              ...existingFields,
              {
                name: `🏈 Teams Checked In — ${updatedCheckedInTeams.length}`,
                value: checkedInValue,
              },
            ],

            footer:
              currentEmbed?.footer || {
                text:
                  "NEW ERA CFM • Commissioner Activity Center",
              },

            timestamp:
              currentEmbed?.timestamp ||
              new Date().toISOString(),

            thumbnail: currentEmbed?.thumbnail,
            image: currentEmbed?.image,
            author: currentEmbed?.author,
          },
        ],

        components:
          interaction.message?.components || [],
      },
    });
  }

  return NextResponse.json({
    type: RESPONSE_CHANNEL_MESSAGE,
    data: {
      content: "That button is not currently supported.",
      flags: 64,
    },
  });
}