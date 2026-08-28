import { NextRequest, NextResponse } from "next/server";
import { importCanonicalSchedule } from "@/lib/madden/schedule-sync";
import { runWeeklyHighlights } from "@/lib/discord/weekly-highlights";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function array(value: unknown): UnknownRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is UnknownRecord =>
          Boolean(item) &&
          typeof item === "object" &&
          !Array.isArray(item),
      )
    : [];
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function canonicalTeamAbbreviation(value: unknown) {
  const cleaned = stringValue(value).toUpperCase();

  const aliases: Record<string, string> = {
    AZ: "ARI",
    JAC: "JAX",
    WSH: "WAS",
    OAK: "LV",
    SD: "LAC",
    STL: "LAR",
    LA: "LAR",
  };

  return aliases[cleaned] ?? cleaned;
}

function providedSecret(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return (
    request.headers.get("x-madden-sync-secret")?.trim() ||
    request.headers.get("x-snallabot-secret")?.trim() ||
    null
  );
}

function gameTypeFromStage(stageIndex: number) {
  if (stageIndex === 0) return "preseason";
  if (stageIndex === 2) return "postseason";
  return "regular";
}

function gameStatus(rawStatus: number) {
  // M27 statuses already observed:
  // 1 = not played
  // 2/3 = completed variants
  //
  // Any OTHER positive status is treated as live/in-progress
  // so prediction markets immediately lock instead of
  // accidentally remaining open.
  if (rawStatus === 1) {
    return "scheduled";
  }

  if (rawStatus === 2 || rawStatus === 3) {
    return "final";
  }

  if (rawStatus > 0) {
    return "in_progress";
  }

  return "scheduled";
}

function payloadSummary(payload: unknown) {
  if (Array.isArray(payload)) {
    return {
      payload_type: "array",
      top_level_keys: [] as string[],
      item_count: payload.length,
    };
  }

  if (payload && typeof payload === "object") {
    return {
      payload_type: "object",
      top_level_keys: Object.keys(payload as UnknownRecord).slice(0, 100),
      item_count: null,
    };
  }

  return {
    payload_type: typeof payload,
    top_level_keys: [] as string[],
    item_count: null,
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "NEW ERA Madden 27 direct EA importer",
    provider: "direct_ea",
    status: "ready",
    revision: "m27-ea-import-v3-weekly-media",
  });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

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
      {
        success: false,
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  try {
    const body = record(await request.json());

    const summary = record(body.summary);
    const summaryLeague = record(summary.league);
    const summarySeason = record(summary.season);

    const hub = record(body.hub);
    const hubValue = record(
      record(hub.responseInfo).value,
    );
    const careerHubInfo = record(hubValue.careerHubInfo);
    const hubSeason = record(careerHubInfo.seasonInfo);

    const teamsPayload = record(body.teams);
    const standingsPayload = record(body.standings);

    const eaTeams = array(teamsPayload.leagueTeamInfoList);
    const eaStandings = array(standingsPayload.teamStandingInfoList);

    if (eaTeams.length !== 32) {
      throw new Error(
        `Expected 32 EA teams but received ${eaTeams.length}.`,
      );
    }

    const externalLeagueId = stringValue(summaryLeague.leagueId);
    const leagueName =
      stringValue(summaryLeague.leagueName) || "NewEraSzn1";

    const currentWeek =
      numberValue(hubSeason.displayWeek) ||
      numberValue(summarySeason.seasonWeek) + 1 ||
      1;

    const calendarYear =
      numberValue(hubSeason.calendarYear) ||
      numberValue(summarySeason.calendarYear) ||
      2026;

    const schedules = Array.isArray(body.schedules)
      ? body.schedules
      : [];

    const firstSchedule = schedules
      .map((entry) => record(entry))
      .map((entry) => record(entry.payload))
      .flatMap((payload) => array(payload.gameScheduleInfoList))[0];

    const season =
      firstSchedule
        ? numberValue(firstSchedule.seasonIndex) + 1
        : 1;

    const leagueResult = await supabaseAdmin
      .from("leagues")
      .select("id, slug")
      .eq("slug", "gold-jacket-cfm")
      .maybeSingle();

    if (leagueResult.error) throw leagueResult.error;

    if (!leagueResult.data) {
      throw new Error("The gold-jacket-cfm league row does not exist.");
    }

    const leagueRow = leagueResult.data;

    const internalTeamsResult = await supabaseAdmin
      .from("teams")
      .select("id, abbreviation, city, name");

    if (internalTeamsResult.error) {
      throw internalTeamsResult.error;
    }

    const internalTeams = internalTeamsResult.data ?? [];

    const internalByAbbreviation = new Map(
      internalTeams.map((team) => [
        String(team.abbreviation).toUpperCase(),
        team,
      ]),
    );

    const eaTeamById = new Map<
      number,
      {
        abbreviation: string;
        raw: UnknownRecord;
      }
    >();

    for (const team of eaTeams) {
      const id = numberValue(team.teamId);
      const abbreviation = canonicalTeamAbbreviation(team.abbrName);

      if (!id || !abbreviation) continue;

      eaTeamById.set(id, {
        abbreviation,
        raw: team,
      });
    }

    const canonicalGames = schedules.flatMap((entryValue) => {
      const entry = record(entryValue);
      const payload = record(entry.payload);
      const games = array(payload.gameScheduleInfoList);

      return games.map((game) => {
        const homeExternalId = numberValue(game.homeTeamId);
        const awayExternalId = numberValue(game.awayTeamId);

        const home = eaTeamById.get(homeExternalId);
        const away = eaTeamById.get(awayExternalId);

        if (!home || !away) {
          throw new Error(
            `Unable to map EA teams for schedule ${stringValue(
              game.scheduleId,
            )}.`,
          );
        }

        const stageIndex = numberValue(game.stageIndex, 1);
        const weekIndex = numberValue(game.weekIndex);

        const rawStatus = numberValue(game.status);
        const status = gameStatus(rawStatus);

        return {
          sourceGameId: `ea:${stringValue(game.scheduleId)}`,
          season: numberValue(game.seasonIndex) + 1,
          week: weekIndex + 1,
          gameType: gameTypeFromStage(stageIndex),
          homeTeam: home.abbreviation,
          awayTeam: away.abbreviation,
          homeScore:
            status === "final"
              ? numberValue(game.homeScore)
              : null,
          awayScore:
            status === "final"
              ? numberValue(game.awayScore)
              : null,
          status,
          isPrimetime: Boolean(game.isGameOfTheWeek),
          rawPayload: game,
        };
      });
    });

    if (canonicalGames.length === 0) {
      throw new Error("No EA schedule games were supplied.");
    }

    const scheduleResult = await importCanonicalSchedule({
      leagueSlug: "gold-jacket-cfm",
      source: "ea_franchise",
      provider: "direct_ea",
      gameVersion: "Madden 27",
      syncType: "direct_ea_snapshot",
      season,
      currentWeek,
      suppressPredictionDiscord: Boolean(body.suppressPredictionDiscord),
      games: canonicalGames,
    });

    const standingsByTeamId = new Map(
      eaStandings.map((standing) => [
        numberValue(standing.teamId),
        standing,
      ]),
    );

    // Replace the one current live EA team snapshot per team.
    const deleteSnapshots = await supabaseAdmin
      .from("madden_team_snapshots")
      .delete()
      .eq("league_id", leagueRow.id)
      .eq("source", "ea_franchise")
      .eq("game_version", "Madden 27");

    if (deleteSnapshots.error) {
      throw deleteSnapshots.error;
    }

    const teamSnapshots = eaTeams.flatMap((team) => {
      const abbreviation = canonicalTeamAbbreviation(team.abbrName);
      const internalTeam = internalByAbbreviation.get(abbreviation);

      if (!internalTeam) return [];

      const externalTeamId = numberValue(team.teamId);
      const standing = standingsByTeamId.get(externalTeamId) ?? null;

      return [
        {
          league_id: leagueRow.id,
          team_id: internalTeam.id,
          source: "ea_franchise",
          source_priority: 300,
          game_version: "Madden 27",
          overall: numberValue(team.ovrRating) || null,
          offense: null,
          defense: null,
          attributes: {
            eaTeamId: externalTeamId,
            eaUserName: team.userName ?? null,
            division: team.divName ?? null,
            offenseScheme: team.offScheme ?? null,
            defenseScheme: team.defScheme ?? null,
            standing,
          },
          source_payload: {
            team,
            standing,
          },
          captured_at: new Date().toISOString(),
          imported_at: new Date().toISOString(),
        },
      ];
    });

    if (teamSnapshots.length > 0) {
      const snapshotInsert = await supabaseAdmin
        .from("madden_team_snapshots")
        .insert(teamSnapshots);

      if (snapshotInsert.error) {
        throw snapshotInsert.error;
      }
    }

    const rawExports: Array<{
      exportType: string;
      payload: unknown;
    }> = [
      { exportType: "league-hub", payload: body.hub },
      { exportType: "teams", payload: body.teams },
      { exportType: "standings", payload: body.standings },
    ];

    for (const scheduleValue of schedules) {
      const schedule = record(scheduleValue);
      rawExports.push({
        exportType:
          stringValue(schedule.exportType) ||
          `week-${numberValue(schedule.week)}-schedule`,
        payload: schedule.payload,
      });
    }

    if (Array.isArray(body.stats)) {
      for (const statValue of body.stats) {
        const stat = record(statValue);

        rawExports.push({
          exportType:
            stringValue(stat.exportType) ||
            `week-${numberValue(stat.week)}-${stringValue(stat.category)}`,
          payload: stat.payload,
        });
      }
    }

    let archivedExports = 0;
    let archiveWarning: string | null = null;

    try {
      const rows = rawExports.map((item) => {
        const payloadInfo = payloadSummary(item.payload);

        return {
          source: "ea_franchise",
          export_type: item.exportType,
          status: "received",
          payload: item.payload,
          payload_type: payloadInfo.payload_type,
          top_level_keys: payloadInfo.top_level_keys,
          item_count: payloadInfo.item_count,
          request_headers: {
            provider: "direct_ea",
            leagueId: externalLeagueId,
            calendarYear,
          },
          duration_ms: Date.now() - startedAt,
        };
      });

      const archiveResult = await supabaseAdmin
        .from("league_syncs")
        .insert(rows);

      if (archiveResult.error) {
        archiveWarning = archiveResult.error.message;
      } else {
        archivedExports = rows.length;
      }
    } catch (error) {
      archiveWarning =
        error instanceof Error ? error.message : String(error);
    }

    const leagueUpdate = await supabaseAdmin
      .from("leagues")
      .update({
        name: leagueName,
        season,
        current_week: currentWeek,
        madden_external_league_id: externalLeagueId || null,
        madden_provider: "direct_ea",
        madden_sync_status: "live_sync_active",
        madden_last_sync_at: new Date().toISOString(),
        madden_last_sync_error: null,
        madden_metadata: {
          gameVersion: "Madden 27",
          platform: "Xbox Series X|S",
          provider: "direct_ea",
          externalLeagueId,
          calendarYear,
          eaSeasonWeek:
            numberValue(hubSeason.seasonWeek) ||
            numberValue(summarySeason.seasonWeek),
          eaSeasonWeekType:
            numberValue(hubSeason.seasonWeekType) ||
            numberValue(summarySeason.seasonWeekType),
          displayWeek: currentWeek,
          teamCount: eaTeams.length,
          memberCount: numberValue(summaryLeague.numMembers),
          lastDirectEaSyncAt: new Date().toISOString(),
        },
      })
      .eq("id", leagueRow.id);

    if (leagueUpdate.error) {
      throw leagueUpdate.error;
    }

    let weeklyHighlights: unknown = null;

    try {
      weeklyHighlights =
        await runWeeklyHighlights({
          leagueId: leagueRow.id,
          season,
          currentWeek,
        });
    } catch (highlightError) {
      weeklyHighlights = {
        error:
          highlightError instanceof Error
            ? highlightError.message
            : String(highlightError),
      };

      console.error(
        "Weekly GOTW/POTW automation failed:",
        highlightError,
      );
    }

    return NextResponse.json({
      success: true,
      provider: "direct_ea",
      league: {
        name: leagueName,
        externalLeagueId,
        season,
        calendarYear,
        currentWeek,
      },
      schedule: scheduleResult,
      eaTeams: eaTeams.length,
      eaStandings: eaStandings.length,
      teamSnapshots: teamSnapshots.length,
      archivedExports,
      archiveWarning,
      weeklyHighlights,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("Direct EA Madden import failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Direct EA Madden import failed.",
      },
      { status: 400 },
    );
  }
}
