import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type ActiveCheckType = "league" | "weekly" | "waitlist";

function clampDuration(value: unknown) {
  const parsed = Number(value ?? 24);

  if (!Number.isFinite(parsed)) return 24;
  return Math.min(168, Math.max(0.5, parsed));
}

export async function POST(request: NextRequest) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_ACTIVE_CHECK_CHANNEL_ID;

  if (!botToken || !channelId) {
    return NextResponse.json(
      {
        error:
          "DISCORD_BOT_TOKEN or DISCORD_ACTIVE_CHECK_CHANNEL_ID is missing.",
      },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));

  const type: ActiveCheckType =
    body.type === "weekly" || body.type === "waitlist"
      ? body.type
      : "league";
  const week = typeof body.week === "string" ? body.week.trim() : "";
  const customMessage =
    typeof body.customMessage === "string" ? body.customMessage.trim() : "";
  const durationHours = clampDuration(body.durationHours);
  const showTimer = body.showTimer !== false;
  const reminder6h = body.reminder6h !== false;
  const reminder2h = body.reminder2h !== false;
  const reminder30m = body.reminder30m !== false;
  const finalDm = body.finalDm === true;

  if (type === "weekly" && !week) {
    return NextResponse.json(
      { error: "A week number is required for a weekly owner check." },
      { status: 400 },
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
        "If you're still interested in joining GOLD JACKET, click the button below.";
      break;
    default:
      title = "🏈 League Activity Check";
      description =
        "Click **I'm Active** below to confirm that you're still active in the league.";
  }

  if (customMessage.length > 0) {
    description += `\n\n📢 ${customMessage}`;
  }

  const startedAt = new Date();
  const closesAt = new Date(
    startedAt.getTime() + durationHours * 60 * 60 * 1_000,
  );
  const discordClosesAt = Math.floor(closesAt.getTime() / 1_000);

  try {
    const fields: Array<{ name: string; value: string }> = [
      {
        name: "🏈 Teams Checked In — 0",
        value: "No teams have checked in yet.",
      },
    ];

    if (showTimer) {
      fields.push({
        name: "⏱️ Active Check Closes",
        value: `<t:${discordClosesAt}:F> • <t:${discordClosesAt}:R>`,
      });
    }

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
          allowed_mentions: { parse: ["everyone"] },
          embeds: [
            {
              title,
              description,
              color: 0xd4af37,
              fields,
              footer: {
                text: "GOLD JACKET CFM • Commissioner Activity Center",
              },
              timestamp: startedAt.toISOString(),
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
                  emoji: { name: "✅" },
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
        { status: discordResponse.status },
      );
    }

    const newActiveCheckId =
      typeof responseData.id === "string" ? responseData.id : null;

    if (!newActiveCheckId) {
      return NextResponse.json(
        {
          error:
            "Discord created the message, but no active-check ID was returned.",
        },
        { status: 500 },
      );
    }

    const nowIso = new Date().toISOString();

    const closePreviousResult = await supabaseAdmin
      .from("league_health_active_checks")
      .update({ status: "closed", closed_at: nowIso })
      .eq("status", "open")
      .neq("active_check_id", newActiveCheckId);

    if (closePreviousResult.error) {
      console.error("Unable to close previous active checks:", closePreviousResult.error);
    }

    const checkResult = await supabaseAdmin
      .from("league_health_active_checks")
      .upsert(
        {
          active_check_id: newActiveCheckId,
          channel_id: responseData.channel_id ?? channelId,
          check_type: type,
          title,
          started_at: startedAt.toISOString(),
          discovered_at: nowIso,
          closes_at: closesAt.toISOString(),
          status: "open",
          closed_at: null,
          show_timer: showTimer,
          reminder_6h: reminder6h,
          reminder_2h: reminder2h,
          reminder_30m: reminder30m,
          final_dm: finalDm,
        },
        { onConflict: "active_check_id" },
      );

    if (checkResult.error) {
      console.error("Active check posted but timer metadata failed:", checkResult.error);
      return NextResponse.json(
        {
          error:
            "The Discord check was posted, but its timer settings could not be saved.",
          messageId: newActiveCheckId,
          channelId: responseData.channel_id,
        },
        { status: 500 },
      );
    }

    const clearOldChecksResult = await supabaseAdmin
      .from("active_check_clicks")
      .delete()
      .neq("active_check_id", newActiveCheckId);

    if (clearOldChecksResult.error) {
      console.error(
        "Active check posted, but previous responses could not be cleared:",
        clearOldChecksResult.error,
      );
    }

    return NextResponse.json({
      success: true,
      messageId: newActiveCheckId,
      channelId: responseData.channel_id,
      closesAt: closesAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to create the activity check:", error);

    return NextResponse.json(
      { error: "Failed to create the activity check." },
      { status: 500 },
    );
  }
}
