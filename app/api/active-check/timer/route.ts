import { NextRequest, NextResponse } from "next/server";
import {
  getActiveCheckTimerStatus,
  setDiscordActiveCheckTimerField,
} from "@/lib/active-check/reminders";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TimerBody = {
  activeCheckId?: string;
  hoursRemaining?: number;
  showTimer?: boolean;
  reminder6h?: boolean;
  reminder2h?: boolean;
  reminder30m?: boolean;
  finalDm?: boolean;
};

export async function GET() {
  try {
    const status = await getActiveCheckTimerStatus();

    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    console.error("Unable to load active-check timer status:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load active-check timer status.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TimerBody;
    const status = await getActiveCheckTimerStatus();
    const currentCheck = status.check;

    if (!currentCheck) {
      return NextResponse.json(
        { success: false, error: "No active check was found." },
        { status: 404 },
      );
    }

    const activeCheckId = body.activeCheckId?.trim() || currentCheck.active_check_id;

    if (activeCheckId !== currentCheck.active_check_id) {
      return NextResponse.json(
        {
          success: false,
          error: "That active check is not the current check.",
        },
        { status: 409 },
      );
    }

    const hoursRemaining = Number(body.hoursRemaining ?? 24);

    if (!Number.isFinite(hoursRemaining) || hoursRemaining < 0.5 || hoursRemaining > 168) {
      return NextResponse.json(
        {
          success: false,
          error: "Hours remaining must be between 0.5 and 168.",
        },
        { status: 400 },
      );
    }

    const closesAt = new Date(
      Date.now() + hoursRemaining * 60 * 60 * 1_000,
    ).toISOString();
    const channelId =
      currentCheck.channel_id?.trim() ||
      process.env.DISCORD_ACTIVE_CHECK_CHANNEL_ID?.trim() ||
      null;
    const showTimer = body.showTimer !== false;

    const updateResult = await supabaseAdmin
      .from("league_health_active_checks")
      .update({
        channel_id: channelId,
        closes_at: closesAt,
        status: "open",
        closed_at: null,
        show_timer: showTimer,
        reminder_6h: body.reminder6h !== false,
        reminder_2h: body.reminder2h !== false,
        reminder_30m: body.reminder30m !== false,
        final_dm: body.finalDm === true,
      })
      .eq("active_check_id", activeCheckId)
      .select("active_check_id")
      .single();

    if (updateResult.error) throw updateResult.error;

    let discordWarning: string | null = null;

    try {
      await setDiscordActiveCheckTimerField({
        activeCheckId,
        channelId,
        closesAt,
        showTimer,
      });
    } catch (error) {
      discordWarning =
        error instanceof Error ? error.message : String(error);
    }

    return NextResponse.json({
      success: true,
      activeCheckId,
      closesAt,
      showTimer,
      reposted: false,
      discordWarning,
    });
  } catch (error) {
    console.error("Unable to attach active-check timer:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to attach active-check timer.",
      },
      { status: 500 },
    );
  }
}
