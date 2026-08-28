export const ADVANCE_WINDOW_MS = 48 * 60 * 60 * 1000;

function finiteInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

export function buildCycleKey(league) {
  if (!league) return null;

  const id =
    typeof league.id === "string" && league.id.trim()
      ? league.id.trim()
      : "league";

  return `${id}:${finiteInteger(league.season, 0)}:${finiteInteger(
    league.current_week,
    0,
  )}`;
}

export function createAdvanceBaseline({
  cycleKey,
  leagueId,
  season,
  week,
  observedAt = Date.now(),
}) {
  return {
    kind: "gold_jacket_advance_baseline",
    cycleKey,
    leagueId,
    season: finiteInteger(season, 0),
    week: finiteInteger(week, 0),
    observedAt: new Date(observedAt).toISOString(),
  };
}

export function createAdvanceTimerState({
  cycleKey,
  leagueId,
  season,
  week,
  nowMs = Date.now(),
}) {
  return {
    kind: "gold_jacket_advance_timer",
    cycleKey,
    leagueId,
    season: finiteInteger(season, 0),
    week: finiteInteger(week, 0),
    startedAt: new Date(nowMs).toISOString(),
    deadlineAt: new Date(nowMs + ADVANCE_WINDOW_MS).toISOString(),
  };
}

export function parseAdvanceBaseline(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  if (payload.kind !== "gold_jacket_advance_baseline") return null;
  if (typeof payload.cycleKey !== "string" || !payload.cycleKey) return null;
  if (typeof payload.observedAt !== "string") return null;

  return {
    kind: "gold_jacket_advance_baseline",
    cycleKey: payload.cycleKey,
    leagueId: typeof payload.leagueId === "string" ? payload.leagueId : null,
    season: finiteInteger(payload.season, 0),
    week: finiteInteger(payload.week, 0),
    observedAt: payload.observedAt,
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

  return {
    kind: "gold_jacket_advance_timer",
    cycleKey: payload.cycleKey,
    leagueId: typeof payload.leagueId === "string" ? payload.leagueId : null,
    season: finiteInteger(payload.season, 0),
    week: finiteInteger(payload.week, 0),
    startedAt: payload.startedAt,
    deadlineAt: payload.deadlineAt,
  };
}

export function decideAdvanceTimer({
  league,
  baseline,
  activeTimer,
  nowMs = Date.now(),
}) {
  if (!league) {
    return {
      active: false,
      action: "none",
      cycleKey: null,
      baseline: null,
      timer: null,
    };
  }

  const cycleKey = buildCycleKey(league);

  if (!baseline) {
    return {
      active: false,
      action: "create_baseline",
      cycleKey,
      baseline: createAdvanceBaseline({
        cycleKey,
        leagueId: league.id,
        season: league.season,
        week: league.current_week,
        observedAt: nowMs,
      }),
      timer: null,
    };
  }

  if (baseline.cycleKey !== cycleKey) {
    return {
      active: true,
      action: "advance",
      cycleKey,
      baseline: createAdvanceBaseline({
        cycleKey,
        leagueId: league.id,
        season: league.season,
        week: league.current_week,
        observedAt: nowMs,
      }),
      timer: createAdvanceTimerState({
        cycleKey,
        leagueId: league.id,
        season: league.season,
        week: league.current_week,
        nowMs,
      }),
    };
  }

  if (activeTimer && activeTimer.cycleKey === cycleKey) {
    return {
      active: true,
      action: "none",
      cycleKey,
      baseline,
      timer: activeTimer,
    };
  }

  return {
    active: false,
    action: "none",
    cycleKey,
    baseline,
    timer: null,
  };
}
