import { NextResponse } from "next/server";

import {
  decideAdvanceTimer,
  parseAdvanceBaseline,
  parseAdvanceTimerState,
  type AdvanceBaseline,
  type AdvanceTimerState,
} from "@/lib/advance-timer-core.mjs";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIMER_SOURCE = "gold-jacket-system";
const BASELINE_EXPORT_TYPE = "advance_timer_baseline";
const TIMER_EXPORT_TYPE = "advance_timer";

type LeagueRow = {
  id: string;
  name: string | null;
  slug: string | null;
  current_week: number | null;
  season: number | null;
};

type TimerRow = {
  payload: unknown;
  received_at: string;
};

function isGoldJacketLeague(league: LeagueRow) {
  const slug = league.slug?.trim().toLowerCase() ?? "";
  const name = league.name?.trim().toLowerCase() ?? "";

  return slug === "gold-jacket-cfm" || name.includes("gold jacket");
}

async function loadGoldJacketLeague(): Promise<LeagueRow | null> {
  const { data, error } = await supabaseAdmin
    .from("leagues")
    .select("id,name,slug,current_week,season")
    .limit(100);

  if (error) throw error;

  return (
    ((data ?? []) as LeagueRow[]).find(isGoldJacketLeague) ?? null
  );
}

async function loadLatestPayload(
  exportType: string,
): Promise<unknown | null> {
  const { data, error } = await supabaseAdmin
    .from("league_syncs")
    .select("payload,received_at")
    .eq("source", TIMER_SOURCE)
    .eq("export_type", exportType)
    .eq("status", "completed")
    .order("received_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return ((data ?? []) as TimerRow[])[0]?.payload ?? null;
}

async function persistBaseline(baseline: AdvanceBaseline) {
  const { error } = await supabaseAdmin.from("league_syncs").insert({
    source: TIMER_SOURCE,
    export_type: BASELINE_EXPORT_TYPE,
    status: "completed",
    payload: baseline,
    payload_type: "object",
    top_level_keys: Object.keys(baseline),
    item_count: 1,
    request_headers: {
      system: "gold-jacket-advance-countdown",
    },
    processed_at: baseline.observedAt,
  });

  if (error) throw error;
}

async function persistTimer(timer: AdvanceTimerState) {
  const { error } = await supabaseAdmin.from("league_syncs").insert({
    source: TIMER_SOURCE,
    export_type: TIMER_EXPORT_TYPE,
    status: "completed",
    payload: timer,
    payload_type: "object",
    top_level_keys: Object.keys(timer),
    item_count: 1,
    request_headers: {
      system: "gold-jacket-advance-countdown",
    },
    processed_at: timer.startedAt,
  });

  if (error) throw error;
}

export async function GET() {
  try {
    const league = await loadGoldJacketLeague();

    if (!league) {
      return NextResponse.json(
        {
          success: true,
          active: false,
          reason: "league_not_connected",
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const [rawBaseline, rawTimer] = await Promise.all([
      loadLatestPayload(BASELINE_EXPORT_TYPE),
      loadLatestPayload(TIMER_EXPORT_TYPE),
    ]);

    const baseline = parseAdvanceBaseline(rawBaseline);
    const activeTimer = parseAdvanceTimerState(rawTimer);

    const decision = decideAdvanceTimer({
      league,
      baseline,
      activeTimer,
    });

    if (decision.action === "create_baseline" && decision.baseline) {
      await persistBaseline(decision.baseline);
    }

    if (
      decision.action === "advance" &&
      decision.baseline &&
      decision.timer
    ) {
      await persistBaseline(decision.baseline);
      await persistTimer(decision.timer);
    }

    if (!decision.active || !decision.timer) {
      return NextResponse.json(
        {
          success: true,
          active: false,
          reason:
            decision.action === "create_baseline"
              ? "waiting_for_first_advance"
              : "waiting_for_first_advance",
          league: {
            id: league.id,
            season: league.season,
            currentWeek: league.current_week,
          },
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const nowMs = Date.now();
    const deadlineMs = Date.parse(decision.timer.deadlineAt);
    const remainingSeconds = Math.max(
      0,
      Math.ceil((deadlineMs - nowMs) / 1000),
    );

    return NextResponse.json(
      {
        success: true,
        active: true,
        timer: decision.timer,
        serverNow: new Date(nowMs).toISOString(),
        remainingSeconds,
        due: remainingSeconds === 0,
        league: {
          id: league.id,
          season: league.season,
          currentWeek: league.current_week,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Gold Jacket advance timer failed:", error);

    return NextResponse.json(
      {
        success: false,
        active: false,
        error: "Unable to load the advance countdown.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
