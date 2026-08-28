export const ADVANCE_WINDOW_MS = 48 * 60 * 60 * 1000;

function finiteInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

export function buildCycleKey(league) {
  if (!league) return "prelaunch";

  const id =
    typeof league.id === "string" && league.id.trim()
      ? league.id.trim()
      : "league";

  const season = finiteInteger(league.season, 0);
  const week = finiteInteger(league.current_week, 0);

  return `${id}:${season}:${week}`;
}

export function createAdvanceTimerState({
  cycleKey,
  leagueId = null,
  season = null,
  week = null,
  nowMs = Date.now(),
}) {
  const startedAt = new Date(nowMs).toISOString();
  const deadlineAt = new Date(nowMs + ADVANCE_WINDOW_MS).toISOString();

  return {
    kind: "gold_jacket_advance_timer",
    cycleKey,
    leagueId,
    season: season == null ? null : finiteInteger(season, 0),
    week: week == null ? null : finiteInteger(week, 0),
    startedAt,
    deadlineAt,
  };
}

export function parseAdvanceTimerState(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  if (payload.kind !== "gold_jacket_advance_timer") return null;
  if (typeof payload.cycleKey !== "string" || !payload.cycleKey) return null;
  if (typeof payload.startedAt !== "string") return null;
  if (typeof payload.deadlineAt !== "string") return null;

  if (!Number.isFinite(Date.parse(payload.startedAt))) return null;
  if (!Number.isFinite(Date.parse(payload.deadlineAt))) return null;

  return {
    kind: "gold_jacket_advance_timer",
    cycleKey: payload.cycleKey,
    leagueId:
      typeof payload.leagueId === "string" ? payload.leagueId : null,
    season:
      payload.season == null ? null : finiteInteger(payload.season, 0),
    week: payload.week == null ? null : finiteInteger(payload.week, 0),
    startedAt: payload.startedAt,
    deadlineAt: payload.deadlineAt,
  };
}
