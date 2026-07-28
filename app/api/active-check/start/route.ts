import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type ActiveCheckType = "league" | "weekly" | "waitlist";

export async function POST(request: NextRequest) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_ACTIVE_CHECK_CHANNEL_ID;

  if (!botToken || !channelId) {
    return NextResponse.json(
      {
        error:
          "DISCORD_BOT_TOKEN or DISCORD_ACTIVE_CHECK_CHANNEL_ID is missing.",
      },
      {
        status: 500,
      },
    );
  }

  const body = await request.json().catch(() => ({}));

  const type: ActiveCheckType =
    body.type === "weekly" || body.type === "waitlist"
      ? body.type
      : "league";

  const week =
    typeof body.week === "string"
      ? body.week.trim()
      : "";

  const customMessage =
    typeof body.customMessage === "string"
      ? body.customMessage.trim()
      : "";

  if (type === "weekly" && !week) {
    return NextResponse.json(
      {
        error: "A week number is required for a weekly owner check.",
      },
      {
        status: 400,
      },
    );
  }

  let title = "";
  let description = "";

  switch (type) {
    case "weekly":
      title = `🏈 Week ${week} Activity Check`;
      description = `Please confirm that you're active for Week ${week}.`;
      break;

    case "waitlist":
      title = "📋 Waitlist Activity Check";
      description =
        "If you're still interested in joining NEW ERA, click the button below.";
      break;

    default:
      title = "🏈 League Activity Check";
      description =
        "Click **I'm Active** below to confirm that you're still active in the league.";
  }

  if (customMessage.length > 0) {
    description += `\n\n📢 ${customMessage}`;
  }

  try {
    const discordResponse = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "@everyone",
          allowed_mentions: {
            parse: ["everyone"],
          },
          embeds: [
            {
              title,
              description,
              color: 0x7c3aed,
              fields: [
                {
                  name: "🏈 Teams Checked In — 0",
                  value: "No teams have checked in yet.",
                },
              ],
              footer: {
                text: "NEW ERA CFM • Commissioner Activity Center",
              },
              timestamp: new Date().toISOString(),
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 3,
                  custom_id: "active_check_join",
                  label: "I'm Active",
                  emoji: {
                    name: "✅",
                  },
                },
              ],
            },
          ],
        }),
      },
    );

    const responseData = await discordResponse.json();

    if (!discordResponse.ok) {
      console.error("Discord rejected the active check:", responseData);

      return NextResponse.json(
        {
          error: "Discord rejected the message.",
          details: responseData,
        },
        {
          status: discordResponse.status,
        },
      );
    }

    const newActiveCheckId =
      typeof responseData.id === "string"
        ? responseData.id
        : null;

    if (!newActiveCheckId) {
      console.error(
        "Discord created the active check without returning a message ID:",
        responseData,
      );

      return NextResponse.json(
        {
          error:
            "Discord created the message, but no active-check ID was returned.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * A newly launched check replaces the previous one.
     *
     * Deleting responses tied to older Discord message IDs ensures the
     * website immediately returns to 0 of 32 instead of showing check-ins
     * from an old or deleted Discord message.
     */
    const { error: clearOldChecksError } = await supabaseAdmin
      .from("active_check_clicks")
      .delete()
      .neq("active_check_id", newActiveCheckId);

    if (clearOldChecksError) {
      console.error(
        "Active check posted, but previous responses could not be cleared:",
        clearOldChecksError,
      );

      return NextResponse.json(
        {
          error:
            "The Discord check was posted, but the previous website check-ins could not be cleared.",
          messageId: newActiveCheckId,
          channelId: responseData.channel_id,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: newActiveCheckId,
      channelId: responseData.channel_id,
    });
  } catch (error) {
    console.error("Failed to create the activity check:", error);

    return NextResponse.json(
      {
        error: "Failed to create the activity check.",
      },
      {
        status: 500,
      },
    );
  }
}