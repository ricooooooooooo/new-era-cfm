import { NextRequest, NextResponse } from "next/server";
import { importCanonicalSchedule } from "@/lib/madden/schedule-sync";
import { getMaddenSyncStatus } from "@/lib/madden/sync-status";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SetupBody = {
  action: "setup";
  leagueName?: string;
  externalLeagueId?: string | null;
  provider?: string;
  season?: number;
  currentWeek?: number;
};

type GameBody = {
  action: "game";
  season?: number;
  week: number;
  awayTeam: string;
  homeTeam: string;
  awayScore?: number | null;
  homeScore?: number | null;
  status?: string;
  scheduledAt?: string | null;
  isPrimetime?: boolean;
  broadcastLabel?: string | null;
};

type BulkBody = {
  action: "bulk_week";
  season?: number;
  week: number;
  bulkText: string;
};

type AdvanceBody = {
  action: "advance_week";
  season?: number;
  currentWeek: number;
};

type RequestBody = SetupBody | GameBody | BulkBody | AdvanceBody;

function providedSecret(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-madden-sync-secret")?.trim() ?? null;
}

function requireInteger(value: unknown, label: string, minimum = 1) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < minimum) {
    throw new Error(`${label} must be an integer of ${minimum} or greater.`);
  }

  return number;
}

function optionalScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return requireInteger(value, "Score", 0);
}

function cleanTeam(value: unknown, label: string) {
  const team = String(value ?? "").trim().toUpperCase();
  if (!team) throw new Error(`${label} is required.`);
  return team;
}

function manualGameId(input: {
  season: number;
  week: number;
  awayTeam: string;
  homeTeam: string;
}) {
  return `manual:s${input.season}:w${input.week}:${input.awayTeam}:${input.homeTeam}`;
}

function parseBulkWeek(text: string, season: number, week: number) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Paste at least one matchup line.");
  }

  return lines.map((line, index) => {
    const scored = line.match(
      /^([A-Za-z]{2,3})\s+(\d+)\s*@\s*([A-Za-z]{2,3})\s+(\d+)$/,
    );

    if (scored) {
      const awayTeam = scored[1].toUpperCase();
      const awayScore = Number(scored[2]);
      const homeTeam = scored[3].toUpperCase();
      const homeScore = Number(scored[4]);

      return {
        sourceGameId: manualGameId({ season, week, awayTeam, homeTeam }),
        season,
        week,
        awayTeam,
        homeTeam,
        awayScore,
        homeScore,
        status: "final",
        rawPayload: { inputLine: line, inputIndex: index },
      };
    }

    const scheduled = line.match(
      /^([A-Za-z]{2,3})\s*@\s*([A-Za-z]{2,3})$/,
    );

    if (scheduled) {
      const awayTeam = scheduled[1].toUpperCase();
      const homeTeam = scheduled[2].toUpperCase();

      return {
        sourceGameId: manualGameId({ season, week, awayTeam, homeTeam }),
        season,
        week,
        awayTeam,
        homeTeam,
        status: "scheduled",
        rawPayload: { inputLine: line, inputIndex: index },
      };
    }

    throw new Error(
      `Line ${index + 1} is invalid. Use 'NYJ @ NE' or 'NYJ 20 @ NE 24'.`,
    );
  });
}

export async function GET() {
  try {
    return NextResponse.json(await getMaddenSyncStatus());
  } catch (error) {
    console.error("Commissioner Madden status failed:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load Madden sync status." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const configuredSecret =
    process.env.MADDEN_SYNC_SECRET ||
    process.env.SNALLABOT_IMPORT_SECRET;

  if (!configuredSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "MADDEN_SYNC_SECRET is not configured.",
      },
      { status: 500 },
    );
  }

  if (providedSecret(request) !== configuredSecret) {
    return NextResponse.json(
      { success: false, error: "Invalid commissioner sync secret." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as RequestBody;

    if (body.action === "setup") {
      const season = requireInteger(body.season ?? 1, "Season");
      const currentWeek = requireInteger(
        body.currentWeek ?? 1,
        "Current week",
      );
      const leagueName =
        String(body.leagueName ?? "NEW ERA CFM").trim() || "NEW ERA CFM";
      const provider = String(body.provider ?? "manual").trim() || "manual";
      const externalLeagueId =
        String(body.externalLeagueId ?? "").trim() || null;

      const result = await supabaseAdmin
        .from("leagues")
        .update({
          name: leagueName,
          season,
          current_week: currentWeek,
          madden_external_league_id: externalLeagueId,
          madden_provider: provider,
          madden_sync_status: "manual_sync_ready",
          madden_last_sync_error: null,
          madden_metadata: {
            gameVersion: "Madden 27",
            platform: "Xbox Series X|S",
            configuredAt: new Date().toISOString(),
          },
        })
        .eq("slug", "gold-jacket-cfm")
        .select("id, name, season, current_week")
        .maybeSingle();

      if (result.error) throw result.error;
      if (!result.data) {
        throw new Error("The gold-jacket-cfm league row does not exist.");
      }

      return NextResponse.json({
        success: true,
        message: "NEW ERA Madden 27 league setup saved.",
        league: result.data,
      });
    }

    if (body.action === "advance_week") {
      const season = requireInteger(body.season ?? 1, "Season");
      const currentWeek = requireInteger(body.currentWeek, "Current week");

      const result = await supabaseAdmin
        .from("leagues")
        .update({
          season,
          current_week: currentWeek,
          madden_sync_status: "manual_sync_active",
          madden_last_sync_at: new Date().toISOString(),
          madden_last_sync_error: null,
        })
        .eq("slug", "gold-jacket-cfm")
        .select("id, season, current_week")
        .maybeSingle();

      if (result.error) throw result.error;
      if (!result.data) throw new Error("NEW ERA league was not found.");

      return NextResponse.json({
        success: true,
        message: `League advanced to Season ${season}, Week ${currentWeek}.`,
        league: result.data,
      });
    }

    if (body.action === "bulk_week") {
      const season = requireInteger(body.season ?? 1, "Season");
      const week = requireInteger(body.week, "Week");
      const games = parseBulkWeek(body.bulkText, season, week);
      const result = await importCanonicalSchedule({
        leagueSlug: "gold-jacket-cfm",
        source: "manual_quick_sync",
        provider: "commissioner_quick_sync",
        gameVersion: "Madden 27",
        syncType: "bulk_week",
        season,
        currentWeek: week,
        games,
      });

      return NextResponse.json({
        success: true,
        message: `Week ${week} imported successfully.`,
        ...result,
      });
    }

    if (body.action === "game") {
      const season = requireInteger(body.season ?? 1, "Season");
      const week = requireInteger(body.week, "Week");
      const awayTeam = cleanTeam(body.awayTeam, "Away team");
      const homeTeam = cleanTeam(body.homeTeam, "Home team");
      const awayScore = optionalScore(body.awayScore);
      const homeScore = optionalScore(body.homeScore);
      const requestedStatus = String(body.status ?? "").trim().toLowerCase();
      const status =
        requestedStatus ||
        (awayScore !== null && homeScore !== null ? "final" : "scheduled");

      const result = await importCanonicalSchedule({
        leagueSlug: "gold-jacket-cfm",
        source: "manual_quick_sync",
        provider: "commissioner_quick_sync",
        gameVersion: "Madden 27",
        syncType: "single_game",
        season,
        currentWeek: week,
        games: [
          {
            sourceGameId: manualGameId({
              season,
              week,
              awayTeam,
              homeTeam,
            }),
            season,
            week,
            awayTeam,
            homeTeam,
            awayScore,
            homeScore,
            status,
            scheduledAt: body.scheduledAt || null,
            isPrimetime: Boolean(body.isPrimetime),
            broadcastLabel: body.broadcastLabel?.trim() || null,
            rawPayload: {
              enteredBy: "commissioner_quick_sync",
              enteredAt: new Date().toISOString(),
            },
          },
        ],
      });

      return NextResponse.json({
        success: true,
        message: `${awayTeam} @ ${homeTeam} saved.`,
        ...result,
      });
    }

    throw new Error("Unknown Madden sync action.");
  } catch (error) {
    console.error("Commissioner Madden sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Madden sync failed.",
      },
      { status: 400 },
    );
  }
}
