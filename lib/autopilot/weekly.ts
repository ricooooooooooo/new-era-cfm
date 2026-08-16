import { runWeeklyHighlights } from "@/lib/discord/weekly-highlights";
import { buildLeagueHealthReport } from "@/lib/league-health/report";
import { generateMarketsForWeek } from "@/lib/predictions/market-engine";
import { supabaseAdmin } from "@/lib/supabase-admin";

type ActionResult = {
  action?: string;
  reason?: string;
  error?: string;
};

function action(
  value: unknown,
): ActionResult {
  return value &&
    typeof value === "object"
    ? value as ActionResult
    : {};
}

async function markerExists(
  marker: string,
) {
  const result =
    await supabaseAdmin
      .from("league_syncs")
      .select("id")
      .eq(
        "source",
        "new_era_autopilot",
      )
      .eq(
        "export_type",
        marker,
      )
      .limit(1);

  if (result.error) {
    throw result.error;
  }

  return Boolean(
    result.data?.length,
  );
}

async function recordEvent(
  exportType: string,
  payload: Record<string, unknown>,
) {
  const result =
    await supabaseAdmin
      .from("league_syncs")
      .insert({
        source:
          "new_era_autopilot",

        export_type:
          exportType,

        status:
          "received",

        payload,

        payload_type:
          "object",

        top_level_keys:
          Object.keys(
            payload,
          ),

        item_count:
          null,

        request_headers: {
          automation:
            "new-era-autopilot",
        },

        duration_ms:
          0,
      });

  if (result.error) {
    throw result.error;
  }
}

export async function runNewEraAutopilot(
  input: {
    leagueId?: string;
    season?: number;
    currentWeek?: number;
    force?: boolean;
  } = {},
) {
  const leagueResult =
    await supabaseAdmin
      .from("leagues")
      .select(
        "id, season, current_week",
      )
      .eq(
        "slug",
        "new-era-cfm",
      )
      .maybeSingle();

  if (leagueResult.error) {
    throw leagueResult.error;
  }

  if (!leagueResult.data) {
    throw new Error(
      "NEW ERA league not found.",
    );
  }

  const leagueId =
    input.leagueId ??
    String(
      leagueResult.data.id,
    );

  const season =
    input.season ??
    Number(
      leagueResult.data.season ??
        1,
    );

  const currentWeek =
    input.currentWeek ??
    Number(
      leagueResult.data
        .current_week ??
        1,
    );

  const completeMarker =
    `season-${season}-week-${currentWeek}-autopilot-complete`;

  if (
    !input.force &&
    await markerExists(
      completeMarker,
    )
  ) {
    return {
      success: true,
      complete: true,
      alreadyComplete: true,
      season,
      currentWeek,
    };
  }

  const startedAt =
    Date.now();

  const jobs: Record<
    string,
    unknown
  > = {};

  const errors:
    string[] =
      [];

  /*
   * JOB 1:
   * Ensure the new week's prediction
   * markets exist.
   */
  try {
    jobs.predictions =
      await generateMarketsForWeek(
        leagueId,
        season,
        currentWeek,
      );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    jobs.predictions = {
      status: "error",
      error: message,
    };

    errors.push(
      `Predictions: ${message}`,
    );
  }

  /*
   * JOB 2 + 3:
   * Previous week POTW and current
   * week GOTW.
   *
   * Their own markers make this
   * safe to retry.
   */
  try {
    const highlights =
      await runWeeklyHighlights({
        leagueId,
        season,
        currentWeek,
      });

    jobs.highlights =
      highlights;

    const potw =
      action(
        highlights.potw,
      );

    const gotw =
      action(
        highlights.gotw,
      );

    const potwOkay =
      potw.action ===
        "posted" ||
      potw.action ===
        "already_posted" ||
      (
        currentWeek <=
          1 &&
        potw.action ===
          "skip"
      );

    const gotwOkay =
      gotw.action ===
        "posted" ||
      gotw.action ===
        "already_posted";

    if (!potwOkay) {
      errors.push(
        `POTW not complete: ${
          potw.error ??
          potw.reason ??
          potw.action ??
          "unknown"
        }`,
      );
    }

    if (!gotwOkay) {
      errors.push(
        `GOTW not complete: ${
          gotw.error ??
          gotw.reason ??
          gotw.action ??
          "unknown"
        }`,
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    jobs.highlights = {
      status: "error",
      error: message,
    };

    errors.push(
      `Highlights: ${message}`,
    );
  }

  /*
   * JOB 4:
   * Recalculate League Health so
   * commissioner data is ready.
   */
  try {
    const health =
      await buildLeagueHealthReport();

    jobs.leagueHealth = {
      status: "ready",
      overall:
        health.overall,
      revision:
        health.revision,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    jobs.leagueHealth = {
      status: "error",
      error: message,
    };

    errors.push(
      `League Health: ${message}`,
    );
  }

  const result = {
    season,
    currentWeek,
    jobs,
    errors,
    completedAt:
      new Date()
        .toISOString(),
    durationMs:
      Date.now() -
      startedAt,
  };

  if (
    errors.length >
    0
  ) {
    await recordEvent(
      `season-${season}-week-${currentWeek}-autopilot-failed-${Date.now()}`,
      result,
    );

    return {
      success: false,
      complete: false,
      ...result,
    };
  }

  await recordEvent(
    completeMarker,
    result,
  );

  return {
    success: true,
    complete: true,
    alreadyComplete: false,
    ...result,
  };
}

export async function getNewEraAutopilotStatus() {
  const leagueResult =
    await supabaseAdmin
      .from("leagues")
      .select(
        "id, season, current_week",
      )
      .eq(
        "slug",
        "new-era-cfm",
      )
      .maybeSingle();

  if (leagueResult.error) {
    throw leagueResult.error;
  }

  if (!leagueResult.data) {
    throw new Error(
      "NEW ERA league not found.",
    );
  }

  const season =
    Number(
      leagueResult.data.season ??
        1,
    );

  const currentWeek =
    Number(
      leagueResult.data
        .current_week ??
        1,
    );

  const marker =
    `season-${season}-week-${currentWeek}-autopilot-complete`;

  const eventsResult =
    await supabaseAdmin
      .from("league_syncs")
      .select(
        "export_type, status, payload, received_at",
      )
      .eq(
        "source",
        "new_era_autopilot",
      )
      .order(
        "received_at",
        {
          ascending: false,
        },
      )
      .limit(10);

  if (
    eventsResult.error
  ) {
    throw eventsResult.error;
  }

  return {
    revision:
      "new-era-autopilot-v1",

    season,

    currentWeek,

    complete:
      await markerExists(
        marker,
      ),

    marker,

    recent:
      eventsResult.data ??
      [],
  };
}
