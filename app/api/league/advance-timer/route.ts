import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  buildCycleKey,
  createAdvanceTimerState,
  parseAdvanceTimerState,
  type AdvanceTimerState,
} from "@/lib/advance-timer-core.mjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIMER_SOURCE = "gold-jacket-system";
const TIMER_EXPORT_TYPE = "advance_timer";

type LeagueRow = {
  id: string;
  name: string | null;
  slug: string | null;
  current_week: number | null;
  season: number | null;
};

type TimerRow = {
  id: string;
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

  if (error) {
    console.error("Advance timer league lookup failed:", error);
    throw new Error("Unable to read league state.");
  }

  return ((data ?? []) as LeagueRow[]).find(isGoldJacketLeague) ?? null;
}

async function loadLatestTimer(): Promise<AdvanceTimerState | null> {
  const { data, error } = await supabaseAdmin
    .from("league_syncs")
    .select("id,payload,received_at")
    .eq("source", TIMER_SOURCE)
    .eq("export_type", TIMER_EXPORT_TYPE)
    .eq("status", "completed")
    .order("received_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Advance timer storage read failed:", error);
    throw new Error("Unable to read advance timer.");
  }

  for (const row of (data ?? []) as TimerRow[]) {
    const parsed = parseAdvanceTimerState(row.payload);
    if (parsed) return parsed;
  }

  return null;
}

async function persistTimer(
  state: AdvanceTimerState,
): Promise<AdvanceTimerState> {
  const { data, error } = await supabaseAdmin
    .from("league_syncs")
    .insert({
      source: TIMER_SOURCE,
      export_type: TIMER_EXPORT_TYPE,
      status: "completed",
      payload: state,
      payload_type: "object",
      top_level_keys: [
        "kind",
        "cycleKey",
        "leagueId",
        "season",
        "week",
        "startedAt",
        "deadlineAt",
      ],
      item_count: 1,
      request_headers: {
        system: "gold-jacket-advance-countdown",
      },
      processed_at: new Date().toISOString(),
    })
    .select("payload")
    .single();

  if (error || !data) {
    console.error("Advance timer storage insert failed:", error);
    throw new Error("Unable to save advance timer.");
  }

  const saved = parseAdvanceTimerState(data.payload);
  if (!saved) {
    throw new Error("Advance timer storage returned an invalid payload.");
  }

  return saved;
}

export async function GET() {
  try {
    const league = await loadGoldJacketLeague();
    const cycleKey = buildCycleKey(league);

    let timer = await loadLatestTimer();

    if (!timer || timer.cycleKey !== cycleKey) {
      timer = await persistTimer(
        createAdvanceTimerState({
          cycleKey,
          leagueId: league?.id ?? null,
          season: league?.season ?? null,
          week: league?.current_week ?? null,
        }),
      );
    }

    const serverNowMs = Date.now();
    const deadlineMs = Date.parse(timer.deadlineAt);
    const remainingSeconds = Math.max(
      0,
      Math.ceil((deadlineMs - serverNowMs) / 1000),
    );

    return NextResponse.json(
      {
        success: true,
        timer,
        league: league
          ? {
              id: league.id,
              name: league.name,
              slug: league.slug,
              season: league.season,
              currentWeek: league.current_week,
            }
          : null,
        serverNow: new Date(serverNowMs).toISOString(),
        remainingSeconds,
        due: remainingSeconds === 0,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Advance timer route failed:", error);

    return NextResponse.json(
      {
        success: false,
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
